const tabs=[...document.querySelectorAll('.tab')],panes=[...document.querySelectorAll('.pane')];
tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===b));panes.forEach(p=>p.classList.toggle('active',p.id===b.dataset.id))});
function msg(s){let t=document.getElementById('toast');t.textContent=s;t.style.display='block';setTimeout(()=>t.style.display='none',5000)}
const formData=form=>Object.fromEntries(new FormData(form).entries());
document.getElementById('register').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;try{const r=await TikTakAPI.request('/auth/register',{method:'POST',body:JSON.stringify(formData(f))});TikTakAPI.saveSession(r);msg('Konti yawe yafunguwe neza.');setTimeout(()=>location.href='dashboard.html',900)}catch(err){msg(err.message)}};
document.getElementById('login').onsubmit=async e=>{e.preventDefault();try{const r=await TikTakAPI.request('/auth/login',{method:'POST',body:JSON.stringify(formData(e.currentTarget))});TikTakAPI.saveSession(r);msg('Winjiye muri konti yawe neza.');setTimeout(()=>location.href='dashboard.html',700)}catch(err){msg(err.message)}};
document.getElementById('country').onchange=e=>document.getElementById('currency').textContent=e.target.value==='Rwanda'?'RWF':'KES';
document.getElementById('listing').onsubmit=async e=>{
 e.preventDefault();if(!TikTakAPI.token){msg('Banza winjire cyangwa ufungure konti y’umugurisha.');return}
 const f=e.currentTarget,v=formData(f),types={'Ikibanza':'LAND','Inzu':'HOUSE','Imodoka':'CAR'},country=v.country;
 const payload={type:types[f.querySelector('select').value],title:v.title,country,province:v.province,district:v.district,locality:v.locality,price:Number(v.price),currency:country==='Rwanda'?'RWF':'KES',description:v.description,details:{}};
 try{
  const created=await TikTakAPI.request('/listings',{method:'POST',body:JSON.stringify(payload)});
  const selected=document.getElementById('listingImages').files;
  if(selected.length){const fd=new FormData();[...selected].forEach(file=>fd.append('images',file));await TikTakAPI.request(`/listings/${created.listing.id}/images`,{method:'POST',body:fd})}
  msg(selected.length?'Itangazo n’amafoto byoherejwe. Birategereje kwemezwa na Admin.':'Itangazo ryoherejwe. Riri mu isuzumwa rya Admin.');
  f.reset();updateFields();
 }catch(err){msg(err.message+' Reba Dashboard mbere yo kongera kohereza.')}
};
const category=document.querySelector('#listing select'),groups={land:document.getElementById('landFields'),house:document.getElementById('houseFields'),car:document.getElementById('carFields')};
function updateFields(){const v=category.value;Object.entries(groups).forEach(([k,el])=>el.style.display=(v==='Ikibanza'&&k==='land'||v==='Inzu'&&k==='house'||v==='Imodoka'&&k==='car')?'block':'none')}
category.addEventListener('change',updateFields);updateFields();if(location.hash==='#login')document.querySelector('[data-id="login"]')?.click();
