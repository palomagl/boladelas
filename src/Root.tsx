import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {LogIn,LockKeyhole,RefreshCw,WifiOff,ShieldCheck,CloudUpload,CheckCircle2} from 'lucide-react';
import App from './App';
import {isSupabaseConfigured,supabase} from './lib/supabase';
import {loadCloudData,saveCloudData} from './lib/cloud-data';
import type {Data} from './model';
import {readOffline,writeOffline} from './lib/offline';
const empty=():Data=>({season:new Date().getFullYear(),players:[],rounds:[],extras:[]});
function Login({onLogin}:{onLogin:()=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{
  const {error}=await supabase!.auth.signInWithPassword({email:email.trim(),password});
  if(error)throw error;onLogin();
 }catch(err){setError(err instanceof Error?err.message:'Não foi possível entrar. Confira seus dados.')}finally{setBusy(false)}};
 return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><img src="/icon.svg" alt="BolaDelas"/><span className="eyebrow">ACESSO DA ORGANIZADORA</span><h1>BolaDelas<span className="dot">.</span></h1><p>Entre para organizar os jogos, gols e pagamentos do time.</p><label>E-mail<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label><label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}><LogIn size={18}/>{busy?'Entrando…':'Entrar'}</button><div className="auth-security"><LockKeyhole size={16}/> Acesso privado · Sem cadastro público</div></form></div>;
}
function CloudSession({session}:{session:Session}){
 const owner=session.user.id;
 const [data,setData]=useState<Data|null>(null);
 const [online,setOnline]=useState(()=>navigator.onLine);
 const [pending,setPending]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [storageError,setStorageError]=useState('');
 const dataRef=useRef<Data|null>(null);
 const revision=useRef(0);
 const pendingRef=useRef(false);
 const running=useRef(false);
 const active=useRef(true);

 const showData=(value:Data,unsynced:boolean)=>{
  dataRef.current=value;
  pendingRef.current=unsynced;
  setData(value);
  setPending(unsynced);
 };

 // Salva snapshots completos em ordem, sem perder alterações feitas durante a sincronização.
 const syncNow=useCallback(async()=>{
  if(running.current||!navigator.onLine||!pendingRef.current||!dataRef.current)return;
  running.current=true;setBusy(true);
  try {
   while(active.current&&navigator.onLine&&pendingRef.current&&dataRef.current){
    const snapshot=dataRef.current;
    const currentRevision=revision.current;
    await saveCloudData(owner,snapshot);
    if(currentRevision===revision.current){
     // Só marcar como sincronizado depois de persistir esse estado inteiro.
     writeOffline(owner,snapshot,false);
     pendingRef.current=false;
     setPending(false);
     setError('');
    }
   }
  } catch(e) {
   // O snapshot local permanece pendente. Nunca limpar na falha.
   if(active.current)setError(e instanceof Error?e.message:'Não foi possível sincronizar');
  } finally {
   running.current=false;
   if(active.current)setBusy(false);
  }
 },[owner]);

 const load=useCallback(async()=>{
  setError('');
  const cached=readOffline(owner);
  if(cached?.pending){
   // Nunca substituir edições locais ainda não enviadas por dados remotos antigos.
   showData(cached.data,true);
   if(navigator.onLine)void syncNow();
   return;
  }
  if(cached&&!navigator.onLine){
   showData(cached.data,false);
   return;
  }
  if(!navigator.onLine){setError('Primeiro acesso offline: abra o aplicativo uma vez com internet para carregar o time.');return}
  try {
   const remote=await loadCloudData(owner);
   if(!active.current)return;
   // Se uma edição local surgiu durante a requisição, não sobrescrever.
   if(pendingRef.current){void syncNow();return}
   showData(remote,false);
   try{writeOffline(owner,remote,false)}catch{setStorageError('O armazenamento deste aparelho está indisponível. Não será possível trabalhar sem internet.')}
  } catch(e) {
   if(!active.current)return;
   if(cached){showData(cached.data,false);setError('Servidor indisponível. Exibindo último registro salvo neste aparelho.')}
   else setError(e instanceof Error?e.message:'Não foi possível carregar os dados');
  }
 },[owner,syncNow]);

 useEffect(()=>{
  active.current=true;
  const onOnline=()=>{setOnline(true);if(pendingRef.current)void syncNow();else if(!dataRef.current)void load()};
  const onOffline=()=>setOnline(false);
  const onVisibility=()=>{if(!document.hidden&&navigator.onLine&&pendingRef.current)void syncNow()};
  window.addEventListener('online',onOnline);
  window.addEventListener('offline',onOffline);
  document.addEventListener('visibilitychange',onVisibility);
  void load();
  return()=>{
   active.current=false;
   window.removeEventListener('online',onOnline);
   window.removeEventListener('offline',onOffline);
   document.removeEventListener('visibilitychange',onVisibility);
  };
 },[load,syncNow]);

 const update=(value:Data)=>{
  try {
   // Primeiro gravar localmente (sincronamente), depois mostrar a atualização.
   writeOffline(owner,value,true);
   setStorageError('');
  }catch{
   setStorageError('Não foi possível guardar as alterações neste aparelho. Libere espaço e tente novamente.');
   return;
  }
  revision.current++;
  showData(value,true);
  setError('');
  if(navigator.onLine)void Promise.resolve().then(syncNow);
 };
 const retry=()=>{setError('');if(pendingRef.current)void syncNow();else void load()};
 const logout=async()=>{
  if(pendingRef.current){
   const allow=window.confirm('Existem alterações aguardando sincronização. Sair agora pode impedir o envio automático até entrar novamente nesta mesma conta e aparelho. Deseja sair?');
   if(!allow)return;
  }
  await supabase!.auth.signOut();
 };

 if(!data)return <div className="auth-screen"><div className="auth-card"><img src="/icon.svg" alt="BolaDelas"/><h2>Carregando teu time…</h2>{error&&<><p className="form-error" role="alert">{error}</p><button className="primary wide" onClick={retry}><RefreshCw size={17}/> Tentar novamente</button><button className="secondary wide" onClick={logout}>Sair</button></>}</div></div>;
 const status=pending ?(!online?'Sem internet · alterações salvas neste aparelho':busy?'Sincronizando alterações…':'Alterações aguardando envio')
   :!online?'Sem internet · últimas informações disponíveis':'Dados salvos no Supabase';
 return <>
  <App remoteData={data} saveRemote={update} saveStatus={status} onLogout={()=>{void logout()}}/>
  {(!online||pending||Boolean(error)||Boolean(storageError))&&
   <div className={'offline-notice '+(!online?'is-offline':error||storageError?'has-error':'is-syncing')} role="status">
    {(!online||error||storageError)?<WifiOff size={19}/>:pending?<CloudUpload size={19}/>:<CheckCircle2 size={19}/>}
    <div className="offline-notice-text"><strong>{storageError?'Armazenamento indisponível':!online?'Sem conexão':error?'Problema ao sincronizar':busy?'Sincronizando…':'Aguardando envio'}</strong>
     <span>{storageError||(!online?'Suas alterações serão guardadas neste aparelho e enviadas quando a internet voltar.':error||'As alterações serão enviadas automaticamente assim que a conexão estiver disponível.')}</span>
    </div>
    {online&&(pending||error)&&<button type="button" onClick={retry} disabled={busy} aria-label="Tentar sincronizar"><RefreshCw size={18}/></button>}
   </div>}
 </>;
}
export default function Root(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[authError,setAuthError]=useState('');
 useEffect(()=>{if(!supabase){setReady(true);return}let active=true;
  supabase.auth.getSession().then(({data,error})=>{if(!active)return;if(error)setAuthError(error.message);setSession(data.session);setReady(true)}).catch(e=>{if(active){setAuthError(String(e));setReady(true)}});
  const {data:sub}=supabase.auth.onAuthStateChange((_event,newSession)=>{if(active){setSession(newSession);setReady(true)}});
  return()=>{active=false;sub.subscription.unsubscribe()};
 },[]);
 if(!isSupabaseConfigured)return <div className="auth-screen"><div className="auth-card"><ShieldCheck size={30}/><h2>Conexão não configurada</h2><p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel para ativar o acesso privado.</p></div></div>;
 if(!ready)return <div className="auth-screen">Abrindo BolaDelas…</div>;
 if(authError&&!session)return <div className="auth-screen"><div className="auth-card"><h2>Não foi possível verificar o acesso</h2><p>{authError}</p><button className="primary wide" onClick={()=>location.reload()}>Tentar novamente</button></div></div>;
 return session?<CloudSession key={session.user.id} session={session}/>:<Login onLogin={()=>{}}/>;
}
