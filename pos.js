// pos.js - ButterBean POS
// Requires firebase-compat loaded by pos.html

/* ===== FIREBASE CONFIG (same project) ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAG_RsdqHCslRR-xW2-3GrEKXn-UYAECYY",
  authDomain: "butterbean-3869c.firebaseapp.com",
  projectId: "butterbean-3869c",
  storageBucket: "butterbean-3869c.firebasestorage.app",
  messagingSenderId: "329727412036",
  appId: "1:329727412036:web:7e41bebb8094fb70847911"
};
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* PINS (editable) */
const PINS = {
  managers: { "7788": "Manager A", "9922": "Manager B" },
  staff:    { "1942": "Staff A",   "5511": "Staff B" }
};
let currentUser = null;

/* MENU (from your images) */
const MENU = {
  "Classic Pizzas":[
    {n:"Margherita", variants:[{label:"20cm",p:35},{label:"30cm",p:70}]},
    {n:"Butterbean Chicken", variants:[{label:"20cm",p:40},{label:"30cm",p:80}]},
    {n:"Butterbean Bacon", variants:[{label:"20cm",p:40},{label:"30cm",p:80}]},
    {n:"Butterbean Pepperoni", variants:[{label:"20cm",p:45},{label:"30cm",p:85}]},
    {n:"Regina", variants:[{label:"20cm",p:45},{label:"30cm",p:90}]},
    {n:"Hawaiian", variants:[{label:"20cm",p:45},{label:"30cm",p:90}]},
    {n:"Four Seasons", variants:[{label:"20cm",p:45},{label:"30cm",p:90}]},
    {n:"BBQ Chicken", variants:[{label:"20cm",p:50},{label:"30cm",p:95}]},
    {n:"BBQ Rib", variants:[{label:"20cm",p:50},{label:"30cm",p:100}]}
  ],
  "Deluxe Pizzas":[
    {n:"Meat Lover", variants:[{label:"20cm",p:60},{label:"30cm",p:125}]},
    {n:"Supreme", variants:[{label:"20cm",p:60},{label:"30cm",p:115}]},
    {n:"Mafia", variants:[{label:"20cm",p:60},{label:"30cm",p:115}]},
    {n:"The Ranch", variants:[{label:"20cm",p:60},{label:"30cm",p:115}]},
    {n:"Herbivore", variants:[{label:"20cm",p:65},{label:"30cm",p:130}]},
    {n:"Carnivore", variants:[{label:"20cm",p:70},{label:"30cm",p:145}]},
    {n:"Omnivore", variants:[{label:"20cm",p:75},{label:"30cm",p:175}]}
  ],
  "Burgers":[ {n:"Average Joe",p:70},{n:"Average Jane",p:70},{n:"The Big Cheese",p:75},{n:"The Porky",p:80},{n:"The Butcher",p:120},{n:"The Trident",p:80},{n:"Magic Mushroom",p:75}],
  "Toasted":[{n:"Cheese",p:15},{n:"Cheese & Tomato",p:20},{n:"Ham & Cheese",p:30},{n:"Ham, Cheese & Tomato",p:35},{n:"Bacon & Cheese",p:30},{n:"Bacon, Egg & Cheese",p:35},{n:"Chicken Mayo",p:35}],
  "Meals":[{n:"Ribs & Chips",p:120},{n:"Buffalo Wings & Chips",p:75},{n:"Chicken Strips & Chips",p:65},{n:"Battered Hake & Chips",p:75},{n:"Chicken Schnitzel",p:80},{n:"Boerewors & Chips",p:75}],
  "Chips & Russian":[{n:"Medium Chips",p:25},{n:"Large Chips",p:50},{n:"Russian (Buget)",p:10},{n:"Russian (Regular)",p:15}],
  "Coffee":[{n:"Americano M",p:20},{n:"Americano L",p:30},{n:"Cappuccino M",p:25},{n:"Cappuccino L",p:35},{n:"Latte M",p:25},{n:"Latte L",p:35},{n:"Frappe M",p:25},{n:"Frappe L",p:35},{n:"Flat White M",p:25},{n:"Flat White L",p:35},{n:"Mocacino M",p:30},{n:"Mocacino L",p:40}],
  "Shakes":[{n:"Chocolate Shake M",p:25},{n:"Chocolate Shake L",p:35},{n:"Strawberry Shake M",p:25},{n:"Strawberry Shake L",p:35},{n:"Banana Shake M",p:25},{n:"Banana Shake L",p:35}],
  "Cold Drinks":[{n:"Coke",p:15},{n:"Fanta",p:15},{n:"Sprite",p:15},{n:"Powerade",p:15},{n:"Stoney",p:15},{n:"Water",p:15}],
  "Extras":[{n:"Pepperoni",p:20},{n:"Mozzarella/Cheddar",p:20},{n:"Mushrooms",p:15},{n:"Bacon",p:20},{n:"Pineapple",p:15},{n:"BBQ Chicken",p:20},{n:"BBQ Rib",p:20},{n:"Ham",p:20},{n:"Garlic",p:10},{n:"Olives",p:15},{n:"Onions",p:10},{n:"Peppers",p:10}]
};

let cart = [];
let currentCategory = Object.keys(MENU)[0];
let discount = {type:null,value:0};
let mode = {whatsapp:false, walkin:false};

const categoryBar = document.getElementById('categoryBar');
const menuGrid = document.getElementById('menuGrid');
const cartItems = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const subtotalEl = document.getElementById('subtotal');
const discountDisplay = document.getElementById('discountDisplay');
const cartCountEl = document.getElementById('cartCount');
const tillUserEl = document.getElementById('tillUser');

function init(){
  renderCategories();
  renderMenu();
  renderCart();
  // default signed-in user (optionally set via PIN flow later)
  currentUser = {name:'POS-Device'};
  document.getElementById('userBadge').innerText = currentUser.name;
}
function renderCategories(){
  categoryBar.innerHTML='';
  Object.keys(MENU).forEach(cat=>{
    const b=document.createElement('button');
    b.className='cat-btn'+(cat===currentCategory?' active':'');
    b.innerText=cat;
    b.onclick=()=>{currentCategory=cat; renderCategories(); renderMenu();}
    categoryBar.appendChild(b);
  });
}
function renderMenu(){
  const q=(document.getElementById('quickSearch')?document.getElementById('quickSearch').value.toLowerCase():'');
  menuGrid.innerHTML='';
  (MENU[currentCategory]||[]).forEach(it=>{
    if(q && !it.n.toLowerCase().includes(q)) return;
    const card=document.createElement('div'); card.className='menu-item';
    const left=document.createElement('div'); left.className='menu-left';
    left.innerHTML=`<div class="item-name">${it.n}</div><div class="item-desc">${it.desc||''}</div>`;
    const right=document.createElement('div'); right.style.display='flex'; right.style.flexDirection='column'; right.style.alignItems='flex-end';
    const priceEl = document.createElement('div'); priceEl.className='item-price';
    if(it.variants && it.variants.length) priceEl.innerText = `from R${Math.min(...it.variants.map(v=>v.p))}`;
    else priceEl.innerText = `R${it.p}`;
    const addBtn=document.createElement('button'); addBtn.className='btn'; addBtn.innerText='Add';
    addBtn.onclick = ()=> onItemAdd(it);
    right.appendChild(priceEl); right.appendChild(addBtn);
    card.appendChild(left); card.appendChild(right);
    menuGrid.appendChild(card);
  });
}

function onItemAdd(item){
  if(item.variants && item.variants.length>0){
    showSizeModal(item);
    return;
  }
  addToCart({n:item.n, p:Number(item.p), qty:1});
}

function showSizeModal(item){
  document.getElementById('sizeModal').style.display='flex';
  document.getElementById('sizeModalTitle').innerText = item.n;
  const opts = document.getElementById('sizeOptions');
  opts.innerHTML='';
  item.variants.forEach(v=>{
    const b=document.createElement('button'); b.className='btn size-btn'; b.innerText=`${v.label} — R${v.p}`;
    b.onclick = ()=> { closeSizeModal(); addToCart({n:`${item.n} ${v.label}`, p:Number(v.p), qty:1}); };
    opts.appendChild(b);
  });
}
function closeSizeModal(){ document.getElementById('sizeModal').style.display='none'; }

function addToCart(it){
  const idx = cart.findIndex(c=>c.n===it.n && c.p===it.p && !c.custom);
  if(idx!==-1) cart[idx].qty += (it.qty||1);
  else cart.push({...it, qty:it.qty||1, custom:!!it.custom});
  renderCart();
}

function changeQty(i,delta){ cart[i].qty += delta; if(cart[i].qty<=0) cart.splice(i,1); renderCart(); }
function removeItem(i){ cart.splice(i,1); renderCart(); }

function renderCart(){
  cartItems.innerHTML=''; if(cart.length===0){ cartItems.innerText='Cart is empty'; cartTotalEl.innerText='0.00'; subtotalEl.innerText='R0.00'; discountDisplay.innerText='R0.00'; cartCountEl.innerText='(0)'; return; }
  let subtotal=0, totalItems=0;
  cart.forEach((c,i)=>{
    subtotal += c.p * c.qty; totalItems += c.qty;
    const row=document.createElement('div'); row.className='cart-line';
    const left=document.createElement('div'); left.className='cart-left';
    const tick=document.createElement('div'); tick.className='cart-tick'; tick.innerText='?';
    const meta=document.createElement('div'); meta.className='cart-meta';
    meta.innerHTML = `<div style="font-weight:700">${c.n}</div><div style="font-size:12px;color:rgba(255,255,255,0.6)">R${c.p} × ${c.qty}</div>`;
    left.appendChild(tick); left.appendChild(meta);
    const right=document.createElement('div'); right.className='cart-right';
    const qtyControls=document.createElement('div');
    qtyControls.innerHTML = `<button class="small-btn" onclick="changeQty(${i},1)">+1</button> <button class="small-btn" onclick="changeQty(${i},-1)">-1</button> <button class="small-btn" onclick="removeItem(${i})">Remove</button>`;
    const lineTotal=document.createElement('div'); lineTotal.style.fontWeight='800'; lineTotal.innerText = `R${(c.p*c.qty).toFixed(2)}`;
    right.appendChild(qtyControls); right.appendChild(lineTotal);
    row.appendChild(left); row.appendChild(right);
    cartItems.appendChild(row);
  });

  let discAmount=0;
  if(discount.type==='fixed') discAmount = Number(discount.value);
  if(discount.type==='percent') discAmount = subtotal * (Number(discount.value)/100);
  const final = Math.max(0, subtotal - discAmount);
  subtotalEl.innerText = `R${subtotal.toFixed(2)}`;
  discountDisplay.innerText = `R${discAmount.toFixed(2)}`;
  cartTotalEl.innerText = final.toFixed(2);
  cartCountEl.innerText = `(${totalItems})`;
}

/* quick flows */
function setWalkIn(){ mode.walkin=true; mode.whatsapp=false; alert('Walk-in mode'); }
function setWhatsApp(){ mode.whatsapp=true; mode.walkin=false; alert('WhatsApp Order mode (won’t notify staff)'); }

/* discount popups */
function openDiscount(){ document.getElementById('discountPopup').style.display='flex'; }
function closeDiscount(){ document.getElementById('discountPopup').style.display='none'; }
function discountCartPrompt(){
  const v = prompt('Enter discount (number or percent, e.g. 10%)');
  if(!v) return;
  if(String(v).includes('%')) discount = {type:'percent', value: Number(String(v).replace('%',''))};
  else discount = {type:'fixed', value: Number(v)};
  closeDiscount(); renderCart();
}
function discountItemPrompt(){
  if(cart.length===0) return alert('Cart empty');
  let list = cart.map((c,i)=>`${i+1}) ${c.n} - R${c.p} x${c.qty}`).join('\n');
  const sel = prompt(`Choose item to discount:\n${list}\nEnter number:`);
  const idx = Number(sel)-1; if(isNaN(idx) || idx<0 || idx>=cart.length) return;
  const v = prompt('Discount (number or percent, e.g. 10%)'); if(!v) return;
  if(String(v).includes('%')){ const p = Number(String(v).replace('%','')); cart[idx].p = Number((cart[idx].p * (1 - p/100)).toFixed(2)); }
  else { cart[idx].p = Number(Math.max(0, cart[idx].p - Number(v)).toFixed(2)); }
  closeDiscount(); renderCart();
}

/* loyalty */
function openLoyalty(){ document.getElementById('loyaltyPopup').style.display='flex'; }
function closeLoyalty(){ document.getElementById('loyaltyPopup').style.display='none'; }
async function lookupLoyalty(){
  const phone = (document.getElementById('loyaltyPhone').value||'').trim(); if(!phone) return alert('Enter phone');
  const ref = db.collection('loyalty_cards').doc(phone);
  const snap = await ref.get();
  if(!snap.exists){ document.getElementById('loyaltyInfo').innerHTML = `No card for ${phone}.`; return; }
  const d = snap.data(); document.getElementById('loyaltyInfo').innerHTML = `<div><strong>${d.name}</strong></div><div>Stamps: ${d.stamps||0}</div>`;
}
async function createLoyaltyPrompt(){ const phone = (document.getElementById('loyaltyPhone').value||'').trim(); if(!phone) return alert('Enter phone'); const name = prompt('Full name:'); if(!name) return; await db.collection('loyalty_cards').doc(phone).set({name,phone,stamps:0,updated:firebase.firestore.FieldValue.serverTimestamp()}); lookupLoyalty(); }
async function addStampFromPos(){ const phone = (document.getElementById('loyaltyPhone').value||'').trim(); if(!phone) return alert('Lookup phone first'); const ref = db.collection('loyalty_cards').doc(phone); await db.runTransaction(async tx=>{ const s = (await tx.get(ref)).data()?.stamps || 0; tx.update(ref, {stamps: s+1, updated: firebase.firestore.FieldValue.serverTimestamp()}); }); lookupLoyalty(); }

/* complete sale: save + print + clear cart (one button). WhatsApp mode set notifyStaff=false */
async function completeSale(){
  if(cart.length===0) return alert('Cart empty');
  let subtotal=0; cart.forEach(c=>subtotal += c.p * c.qty);
  let discAmount=0;
  if(discount.type==='fixed') discAmount = Number(discount.value);
  if(discount.type==='percent') discAmount = subtotal * (Number(discount.value)/100);
  const total = Math.max(0, subtotal - discAmount);

  const customerName = mode.whatsapp ? 'WhatsApp' : (mode.walkin ? 'Walk-in' : (prompt('Customer name (optional):') || 'Walk-in'));
  const phone = prompt('Customer phone (optional):') || '';
  const payload = {
    customerName, phone,
    items: cart.map(c=>({n:c.n,p:c.p,qty:c.qty})),
    subtotal, discount, total,
    payment: document.getElementById('paymentType') ? document.getElementById('paymentType').value : 'cash',
    source: mode.whatsapp ? 'pos_whatsapp' : 'pos',
    notifyStaff: !mode.whatsapp,
    status: mode.whatsapp ? 'completed_whatsapp' : 'received',
    createdBy: currentUser ? currentUser.name : 'pos',
    created: firebase.firestore.FieldValue.serverTimestamp()
  };

  try{
    const docRef = await db.collection('orders').add(payload);
    printReceipt(docRef.id, payload);
    clearCart();
    alert('Sale saved: ' + docRef.id);
  }catch(e){
    console.error(e);
    alert('Save failed: ' + e);
  }
}

/* print placeholder */
function printReceipt(id, payload){
  const w = window.open('about:blank','_blank','width=420,height=600');
  const d = w.document;
  d.write(`<html><head><title>Receipt ${id}</title><style>body{font-family:Arial;padding:12px} .row{display:flex;justify-content:space-between;margin-bottom:6px} .total{font-weight:800;margin-top:10px}</style></head><body>`);
  d.write(`<div style="text-align:center"><h2>ButterBean</h2><div>Order: ${id}</div><div>${new Date().toLocaleString()}</div></div>`);
  d.write(`<div style="margin-top:12px"><strong>Served by:</strong> ${payload.createdBy}</div><div style="margin-top:12px">`);
  payload.items.forEach(it=> d.write(`<div class="row"><div>${it.n} x${it.qty}</div><div>R${(it.p*it.qty).toFixed(2)}</div></div>`));
  d.write(`</div><div class="total">TOTAL: R${payload.total.toFixed(2)}</div>`);
  d.write(`<div style="margin-top:12px;font-size:12px;color:#666">Thank you for supporting ButterBean</div>`);
  d.write(`</body></html>`);
  d.close();
  setTimeout(()=> w.print(),600);
}

/* utilities */
function clearCart(){ cart=[]; discount={type:null,value:0}; mode.whatsapp=false; mode.walkin=false; renderCart(); }
function closeLoyalty(){ document.getElementById('loyaltyPopup').style.display='none'; }
function closeDiscount(){ document.getElementById('discountPopup').style.display='none'; }
function closeSizeModal(){ document.getElementById('sizeModal').style.display='none'; }

/* init */
document.addEventListener('DOMContentLoaded', init);
window.addToCart = addToCart;
window.completeSale = completeSale;
