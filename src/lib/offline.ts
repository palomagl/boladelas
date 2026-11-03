import type {Data} from '../model';

export type OfflineSnapshot={version:1;data:Data;pending:boolean;savedAt:number};
const storageKey=(owner:string)=>'boladelas-offline-v1:'+owner;

export function readOffline(owner:string):OfflineSnapshot|null {
 try {
  const raw=localStorage.getItem(storageKey(owner));
  if(!raw)return null;
  const value:unknown=JSON.parse(raw);
  if(typeof value!=='object'||value===null)return null;
  const item=value as Partial<OfflineSnapshot>;
  if(item.version!==1||!item.data||!Array.isArray(item.data.players)||!Array.isArray(item.data.rounds))return null;
  return item as OfflineSnapshot;
 } catch{return null}
}

export function writeOffline(owner:string,data:Data,pending:boolean):void {
 // Falha de armazenamento não pode ser apresentada como salvamento concluído.
 localStorage.setItem(storageKey(owner),JSON.stringify({version:1,data,pending,savedAt:Date.now()} satisfies OfflineSnapshot));
}
