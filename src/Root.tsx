import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {LogIn,LockKeyhole,RefreshCw,WifiOff,ShieldCheck,CloudUpload,CheckCircle2} from 'lucide-react';
import App from './App';
import {isSupabaseConfigured,supabase} from './lib/supabase';
import {loadCloudData,saveCloudData} from './lib/cloud-data';
import type {Data} from './model';
import {readOffline,writeOffline} from './lib/offline';
import {activationToken,loginIdentifier,usernameEmail,validateUsername} from './lib/username-auth';
const empty=():Data=>({season:new Date().getFullYear(),players:[],rounds:[],extras:[]});
function Login(){
 const token=activationToken();
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const register=Boolean(token);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase)return;setBusy(true);setError('');
  try{
   if(register){
    const nameError=validateUsername(username);
    if(nameError)throw Error(nameError);
    if(password.length<10)throw Error('Crie uma senha com pelo menos 10 caracteres.');
    const {data,error:signupError}=await supabase.auth.signUp({
      email:usernameEmail(username),password,
      options:{data:{username:username.trim().toLowerCase()}}
    });
    if(signupError)throw signupError;
    if(!data.session)throw Error('O Supabase pediu confirmação de e-mail. Desative Confirm Email no provedor Email antes de ativar esta conta.');
    const claim=await supabase.rpc('boladelas_claim_handoff',{access_token:token});
    if(claim.error)throw Error('A conta foi criada, mas o acesso não foi ativado: '+claim.error.message);
    setDone(true);
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
    window.location.reload();
   }else{
    const {error:loginError}=await supabase.auth.signInWithPassword({email:loginIdentifier(username),password});
    if(loginError)throw loginError;
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar. Confira os dados.')}
  finally{setBusy(false)}
 };
 return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><img src="/icon.svg" alt="BolaDelas"/><span className="eyebrow">{register?'SEU ACESSO AO TIME':'ACESSO DA ORGANIZADORA'}</span><h1>BolaDelas<span className="dot">.</span></h1><p>{register?'Escolha um nome de usuário e uma senha. Depois é só entrar e organizar o futebol.':'Entre com seu usuário e sua senha para continuar.'}</p>
  <label>Nome de usuário<input required autoCapitalize="none" autoComplete="username" spellCheck={false} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ex.: larissa" /></label>
  <label>{register?'Crie uma senha':'Senha'}<input required type="password" autoComplete={register?'new-password':'current-password'} minLength={register?10:undefined} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?'Pelo menos 10 caracteres':'Sua senha'}/></label>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="primary wide" disabled={busy||done}><LogIn size={18}/>{busy?'Aguarde…':register?'Criar meu acesso':'Entrar'}</button>
  <div className="auth-security"><LockKeyhole size={16}/>{register?'Ativação única e privada':'Acesso exclusivo da organizadora'}</div>
  {register&&<p className="auth-hint">Guarde seu usuário e senha. Como não usamos e-mail, a recuperação precisa ser feita pela responsável pelo sistema.</p>}
 </form></div>;
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
 const notice=(!online||pending||Boolean(error)||Boolean(storageError))?
  <div className={'offline-notice '+(!online?'is-offline':error||storageError?'has-error':'is-syncing')} role="status">
   {(!online||error||storageError)?<WifiOff size={19}/>:pending?<CloudUpload size={19}/>:<CheckCircle2 size={19}/>}
   <div className="offline-notice-text">
    <strong>{storageError?'Armazenamento indisponível':!online?'Sem conexão':error?'Problema ao sincronizar':busy?'Sincronizando…':'Aguardando envio'}</strong>
    <span>{storageError||(!online?'Suas alterações ficam salvas neste aparelho e serão enviadas quando a internet voltar.':error||'As alterações serão enviadas automaticamente assim que a conexão estiver disponível.')}</span>
   </div>
   {online&&(pending||error)&&<button type="button" onClick={retry} disabled={busy} aria-label="Tentar sincronizar"><RefreshCw size={18}/></button>}
  </div>:null;
 return <App remoteData={data} saveRemote={update} saveStatus={status} connectionNotice={notice} onLogout={()=>{void logout()}}/>;
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
 return session?<CloudSession key={session.user.id} session={session}/>:<Login/>;
}
