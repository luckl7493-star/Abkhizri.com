const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY),R=window.ROLE,$=s=>document.querySelector(s),app=$('#app');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
const ICON={customer:'icon-192-v3.png',user:'icon-192-user.png',admin:'icon-192-admin.png'}[R];
const em=p=>p.replace(/\D/g,'')+'@aabekhizri.pk',rs=n=>'Rs '+n,SELF='Khud delivery';
const COURIERS=['TCS','Leopards','M&P','Trax','PostEx','Call Courier','BlueEx',SELF,'Other'];
const L={placed:'Approval ka intezar',shipped:'Shipped',delivered:'Delivered'};
let prof,cities=[],seen=0,signup=false,last='';
const fee=c=>{const x=cities.find(k=>k.name==c);return x?Math.min(x.fee_isb,x.fee_rwp):0};
const opts=()=>'<option value="">-- City chunein --</option>'+cities.map(c=>`<option>${c.name}</option>`).join('');
async function init(){
 const{data:{session}}=await sb.auth.getSession();
 const{data:c}=await sb.from('cities').select('*').order('name');cities=c||[];
 if(!session)return authView();
 const{data:p}=await sb.from('profiles').select('*').eq('id',session.user.id).single();
 if(!p||p.role!==R){await sb.auth.signOut();return authView('Yeh account is portal ka nahi hai')}
 prof=p;appView();
}
function authView(msg=''){
 app.innerHTML=`<div class="box"><img src="${ICON}" width="90"><h2>Aab-e-Khizri آب خضری<br><small>${R} login</small></h2><p class="err">${msg}</p>
 ${signup?'<input id=n placeholder="Naam"><select id=c>'+opts()+'</select><textarea id=a placeholder="Address"></textarea>':''}
 <input id=p type=tel placeholder="Mobile number"><input id=w type=password placeholder="Password">
 <button onclick="go()">${signup?'Account banayein':'Login'}</button>
 ${R=='customer'?`<a class=lk onclick="signup=!signup;authView()">${signup?'Login par jayein':'Naya account banayein'}</a>`:''}</div>`;
}
async function go(){
 const e=em($('#p').value),w=$('#w').value;let r;
 if(signup){
  if(!$('#c').value||!$('#a').value)return authView('Pehle city, phir address likhein');
  r=await sb.auth.signUp({email:e,password:w,options:{data:{name:$('#n').value,phone:$('#p').value,city:$('#c').value,address:$('#a').value}}});
 }else r=await sb.auth.signInWithPassword({email:e,password:w});
 if(r.error)return authView(r.error.message);
 signup=false;init();
}
function appView(){
 if('Notification'in window&&Notification.permission=='default')Notification.requestPermission();
 app.innerHTML=`<header><img src="${ICON}"><b>${prof.name} (${R})</b><a class="lk sm" style="color:#fff" onclick="sb.auth.signOut().then(init)">Logout</a></header><main>
 ${R=='customer'?`<div class="card"><h3>Naya order</h3><select id=c onchange="calc()">${opts()}</select>
 <textarea id=a placeholder="Pura address (city ke baad)">${prof.address||''}</textarea><input id=q type=number min=1 value=1 oninput="calc()"><div id=t></div><button onclick="order()">Order karein</button></div>`:''}
 <div id=list></div></main>`;
 if(R=='customer'){$('#c').value=prof.city||'';calc()}
 load();setInterval(load,15000);
}
function calc(){const f=fee($('#c').value),q=+$('#q').value||1;$('#t').innerHTML=`Bottles: ${rs(q*PRICE)} + Delivery: ${rs(f)} = <b>${rs(q*PRICE+f)}</b>`}
async function order(){
 const c=$('#c').value,a=$('#a').value,q=+$('#q').value;if(!c||!a)return alert('Pehle city chunein, phir address likhein');
 const f=fee(c),{error}=await sb.from('orders').insert({customer_id:prof.id,city:c,address:a,qty:q,delivery_fee:f,total:q*PRICE+f,status:'placed'});
 if(error)alert(error.message);load(1);
}
const upd=(id,p)=>sb.from('orders').update(p).eq('id',id).then(()=>load(1));
function approve(id){const courier=$('#c'+id).value;if(!courier)return alert('Courier chunein');upd(id,{status:'shipped',courier,tracking:$('#t'+id).value})}
function label(o){const w=open('');w.document.write(`<body style="font-family:sans-serif;border:2px solid #000;padding:16px;width:380px"><img src="${new URL(ICON,location.href)}" width=60><h3>Aab-e-Khizri</h3><b>${o.profiles.name}</b> - ${o.profiles.phone}<br>${o.city}<br>${o.address}<hr>Bottles: ${o.qty}<br>Courier: ${o.courier||'-'} / ${o.tracking||'-'}<br>Order #${o.id}</body>`);w.print()}
const shrink=f=>new Promise(r=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1024/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.8).split(',')[1])};i.src=URL.createObjectURL(f)});
function rv(id){$('#rv'+id).innerHTML=`<select id=s${id}>${[5,4,3,2,1].map(n=>`<option value=${n}>${'★'.repeat(n)}</option>`).join('')}</select><textarea id=m${id} placeholder="Review likhein"></textarea><input id=f${id} type=file accept="image/*" capture="environment"><small>Aab-e-Khizri ki bottle ya bill ki photo zaroori hai</small><button onclick="sendRv(${id},this)">Review submit karein</button>`}
async function sendRv(id,b){
 const f=$('#f'+id).files[0];if(!f)return alert('Pehle photo kheenchein');
 b.disabled=true;b.textContent='Photo check ho rahi hai...';
 const{data,error}=await sb.functions.invoke('verify-photo',{body:{order_id:id,rating:+$('#s'+id).value,comment:$('#m'+id).value,image:await shrink(f)}});
 b.disabled=false;b.textContent='Review submit karein';
 if(error||data?.error)return alert((data&&data.error)||'Error, dobara koshish karein');
 if(!data.ok)return alert('Photo mein Aab-e-Khizri ki bottle ya bill nazar nahi aaya. Review submit nahi hua.');
 load(1);
}
async function load(force){
 const{data}=await sb.from('orders').select('*,profiles(name,phone),reviews(rating)').order('created_at',{ascending:false});if(!data)return;
 const j=JSON.stringify(data);if(j==last&&!force)return;last=j;window.O=data;
 if(R=='admin'){const d=data.filter(o=>o.status=='delivered').length;if(seen&&d>seen){const m='Customer ne delivery receive kar li';if(Notification.permission=='granted')new Notification(m);else alert(m)}seen=d}
 $('#list').innerHTML=data.map((o,i)=>{let b='';const self=o.courier==SELF;
  if(R=='user'&&o.status=='placed')b=`<select id=c${o.id}><option value="">-- Courier --</option>${COURIERS.map(c=>`<option>${c}</option>`).join('')}</select><input id=t${o.id} placeholder="Tracking number (optional)"><button onclick="approve(${o.id})">Approve & Dispatch</button>`;
  if(R=='user'&&o.status=='shipped'){b=`<button onclick="label(O[${i}])">Label print</button>`;if(self)b+=`<button onclick="upd(${o.id},{status:'delivered'})">Delivered (maine khud de diya)</button>`}
  if(R=='customer'&&o.status=='shipped'&&!self)b=`<button onclick="upd(${o.id},{status:'delivered'})">Delivery mil gayi (Delivered)</button>`;
  if(R=='customer'&&o.status=='delivered')b=o.reviews.length?`<div>Review: ${'★'.repeat(o.reviews[0].rating)}</div>`:`<button onclick="rv(${o.id})">Review dein</button><div id=rv${o.id}></div>`;
  return`<div class="card"><b>#${o.id}</b> <span class="tag">${L[o.status]}</span><br>${R!='customer'?o.profiles.name+' - '+o.profiles.phone+'<br>':''}${o.city}, ${o.address}<br>${o.qty} bottles - ${rs(o.total)} (delivery ${rs(o.delivery_fee)})${o.courier?`<br>Courier: ${o.courier} ${o.tracking||''}`:''}${b}</div>`}).join('')||'<p>Abhi koi order nahi</p>';
}
init();
