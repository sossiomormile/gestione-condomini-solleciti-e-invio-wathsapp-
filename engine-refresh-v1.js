(()=>{
'use strict';
const MARK='condo_engine_refresh_conguagli_neighbor_v2_done';
if(localStorage.getItem(MARK)==='1')return;
try{
  localStorage.removeItem('condo_drive_sync_state_v7');
  localStorage.setItem(MARK,'1');
}catch(e){}
})();
