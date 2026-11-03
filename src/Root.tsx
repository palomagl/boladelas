import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {LogIn,LockKeyhole,LogOut,RefreshCw,WifiOff,ShieldCheck} from 'lucide-react';
import App from './App';
import {isSupabaseConfigured,supabase} from './lib/supabase';
import {loadCloudData,saveCloudData} from './lib/cloud-data';
import type {Data} from './model';
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
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[sync,setSync]=useState<'ok'|'saving'|'failed'>('ok');
 const queue=useRef<Promise<void>>(Promise.resolve());
 const last=useRef<Data|null>(null);
 const alive=useRef(true);
 const load=useCallback(async()=>{setError('');try{const value=await loadCloudData(owner);if(alive.current){last.current=value;setData(value);setSync('ok')}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Erro ao carregar os dados')}},[owner]);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false}},[load]);
 const update=useCallback((value:Data)=>{
  // Em caso de erro, a tela preserva as alterações locais; a usuária pode tentar novamente.
  setData(value);last.current=value;setSync('saving');
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   await saveCloudData(owner,value);
   if(alive.current&&last.current===value)setSync('ok');
  }).catch(e=>{if(alive.current){setError(e instanceof Error?e.message:'Falha ao salvar');setSync('failed')}});
 },[owner]);
 const retry=()=>{if(last.current)update(last.current)};
 const logout=async()=>{if(sync==='saving'||sync==='failed'){if(!window.confirm('Existem alterações que podem não ter sido salvas. Deseja sair mesmo assim?'))return;}await supabase!.auth.signOut()};
 if(!data)return <div className="auth-screen"><div className="auth-card"><img src="/icon.svg" alt="BolaDelas"/><h2>Carregando teu time…</h2>{error&&<><p className="form-error">{error}</p><button className="primary wide" onClick={()=>void load()}><RefreshCw size={17}/> Tentar novamente</button><button className="secondary wide" onClick={logout}>Sair</button></>}</div></div>;
 return <><App remoteData={data} saveRemote={update} saveStatus={sync==='saving'?'Salvando alterações…':sync==='failed'?'Não foi possível sincronizar':'Dados salvos no Supabase'}/><div className="cloud-controls">{sync==='failed'&&<button className="cloud-error" onClick={retry}><WifiOff size={17}/> Falha ao salvar: {error}. Tentar novamente</button>}<button className="cloud-signout" onClick={logout} aria-label="Sair da conta"><LogOut size={16}/> Sair</button></div></>;
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
