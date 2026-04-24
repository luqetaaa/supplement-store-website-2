/* ========= Helpers ========= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));

function toast(msg){
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = msg;
  $("#toasts").appendChild(div);
  setTimeout(()=>{ div.remove(); }, 2500);
}

/* ========= Data ========= */
const PRODUCTS = [
  { id:"whey-vanilla", name:"Whey Protein Isolado - Baunilha 900g", price:199.9, category:"Whey Protein", rating:4.8, emoji:"🥛", off:10, desc:"Proteína isolada, alto teor de BCAA, dissolução rápida." },
  { id:"creatine-300", name:"Creatina Monohidratada 300g", price:129.9, category:"Creatina", rating:4.9, emoji:"⚪", desc:"Monohidratada 100%, performance e força." },
  { id:"pre-workout-x", name:"Pré-treino Xtreme 300g", price:159.9, category:"Pré-treino", rating:4.6, emoji:"⚡", desc:"Cafeína + beta-alanina para foco e energia." },
  { id:"bcaa-120", name:"BCAA 2:1:1 120 cáps", price:89.9, category:"Aminoácidos", rating:4.4, emoji:"🧬", desc:"Leucina, isoleucina e valina para recuperação." },
  { id:"multi-man", name:"Multivitamínico Premium 60 cáps", price:74.9, category:"Vitaminas", rating:4.7, emoji:"✨", desc:"Complexo de vitaminas e minerais." },
  { id:"shaker-700", name:"Coqueteleira 700ml Antivazamento", price:49.9, category:"Acessórios", rating:4.5, emoji:"🧪", desc:"Tampa rosqueável e marcações de volume." },
  { id:"whey-chocolate", name:"Whey Concentrado - Chocolate 1kg", price:149.9, category:"Whey Protein", rating:4.6, emoji:"🍫", off:15, desc:"Sabor intenso de chocolate, ótimo custo-benefício." },
  { id:"creatine-100", name:"Creatina Monohidratada 100g", price:59.9, category:"Creatina", rating:4.3, emoji:"⚪", desc:"Formato enxuto para iniciar o uso." },
];

/* ========= State ========= */
const state = {
  products: [...PRODUCTS],
  filtered: [],
  cart: load("nutri_cart", []),
  favs: load("nutri_favs", []),        // ids
  query: "",
  category: "todas",
  sort: "relevance",
  onlyFavs: false,
  theme: load("nutri_theme", "dark"),  // "dark" | "light"
};

/* ========= Theme ========= */
function applyTheme(){
  if(state.theme === "light"){ document.documentElement.classList.add("light"); }
  else{ document.documentElement.classList.remove("light"); }
  $("#themeToggle").textContent = state.theme === "light" ? "🌞" : "🌙";
  save("nutri_theme", state.theme);
}

/* ========= Rendering ========= */
function productCard(p) {
  const isFav = state.favs.includes(p.id);
  const off = p.off ? `<div class="badge-off">-${p.off}%</div>` : "";
  return `
  <article class="card" role="listitem" aria-label="${p.name}">
    ${off}
    <button class="fav ${isFav ? "active" : ""}" data-fav="${p.id}" aria-label="Favoritar">${isFav ? "❤️" : "🤍"}</button>
    <div class="thumb" aria-hidden="true">${p.emoji}</div>
    <div class="card-body">
      <h3>${p.name}</h3>
      <div class="meta"><span>${p.category}</span> • <span>⭐ ${p.rating.toFixed(1)}</span></div>
      <div class="price">${fmt(p.price)}</div>
      <button class="btn" data-add="${p.id}">Adicionar</button>
      <button class="quick" data-quick="${p.id}">Visualizar</button>
    </div>
  </article>`;
}

function renderGrid() {
  const grid = $("#grid");
  grid.setAttribute("aria-busy","true");
  grid.innerHTML = state.filtered.map(productCard).join("");

  // events
  $$("#grid [data-add]").forEach((btn) =>
    btn.addEventListener("click", (e) => addToCart(e.target.dataset.add))
  );
  $$("#grid [data-quick]").forEach((btn) =>
    btn.addEventListener("click", (e) => openModal(e.target.dataset.quick))
  );
  $$("#grid [data-fav]").forEach((btn) =>
    btn.addEventListener("click", (e) => toggleFav(e.target.dataset.fav))
  );

  grid.setAttribute("aria-busy","false");
}

/* ========= Filtering & Sorting ========= */
function applyFilters() {
  let list = [...state.products];

  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  if (state.category !== "todas") list = list.filter((p) => p.category === state.category);
  if (state.onlyFavs) list = list.filter((p) => state.favs.includes(p.id));

  switch (state.sort) {
    case "price_asc": list.sort((a, b) => a.price - b.price); break;
    case "price_desc": list.sort((a, b) => b.price - a.price); break;
    case "name_asc": list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")); break;
    default: list.sort((a, b) => b.rating - a.rating || a.price - b.price);
  }

  state.filtered = list;
  renderGrid();
}

/* ========= Cart ========= */
function saveCart(){ save("nutri_cart", state.cart); updateCartBadge(); }
function updateCartBadge(){ $("#cartCount").textContent = state.cart.reduce((s, i) => s + i.qty, 0); }

function addToCart(id) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  const found = state.cart.find((i) => i.id === id);
  if (found) found.qty += 1;
  else state.cart.push({ id, qty: 1, price: product.price, name: product.name, emoji: product.emoji });
  saveCart(); renderCart(); openCart();
  toast(`${product.name} adicionado ao carrinho`);
}

function changeQty(id, delta) {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
  saveCart(); renderCart();
}
function removeItem(id) {
  const p = state.products.find(x=>x.id===id);
  state.cart = state.cart.filter((i) => i.id !== id);
  saveCart(); renderCart();
  toast(`${p?.name ?? "Item"} removido`);
}

function renderCart() {
  const list = $("#cartItems");
  if (state.cart.length === 0) {
    list.innerHTML = `<p style="color:var(--muted); text-align:center; padding:18px">Seu carrinho está vazio.</p>`;
    $("#cartSubtotal").textContent = fmt(0);
    return;
  }
  list.innerHTML = state.cart.map((i) => {
      const p = state.products.find((p) => p.id === i.id);
      return `
      <div class="cart-item">
        <div class="cart-thumb">${p?.emoji ?? "🛍️"}</div>
        <div>
          <div style="font-weight:600">${i.name}</div>
          <div style="color:var(--muted); font-size:13px">${fmt(i.price)} • ${p?.category ?? ""}</div>
          <div class="qty">
            <button aria-label="Diminuir" data-dec="${i.id}">−</button>
            <span>${i.qty}</span>
            <button aria-label="Aumentar" data-inc="${i.id}">+</button>
            <button class="remove" data-rem="${i.id}">remover</button>
          </div>
        </div>
        <div style="font-weight:700">${fmt(i.qty * i.price)}</div>
      </div>`;
    }).join("");

  const subtotal = state.cart.reduce((s, i) => s + i.qty * i.price, 0);
  $("#cartSubtotal").textContent = fmt(subtotal);

  $$("#cartItems [data-inc]").forEach((b) => b.addEventListener("click", (e) => changeQty(e.target.dataset.inc, +1)));
  $$("#cartItems [data-dec]").forEach((b) => b.addEventListener("click", (e) => changeQty(e.target.dataset.dec, -1)));
  $$("#cartItems [data-rem]").forEach((b) => b.addEventListener("click", (e) => removeItem(e.target.dataset.rem)));
}

/* ========= Cart Drawer UI ========= */
function openCart(){ $("#cart").classList.add("open"); $("#overlay").classList.add("show"); $("#overlay").setAttribute("aria-hidden","false"); }
function closeCart(){ $("#cart").classList.remove("open"); $("#overlay").classList.remove("show"); $("#overlay").setAttribute("aria-hidden","true"); }

/* ========= Favorites ========= */
function toggleFav(id){
  const idx = state.favs.indexOf(id);
  if(idx >= 0) state.favs.splice(idx,1);
  else state.favs.push(id);
  save("nutri_favs", state.favs);
  applyFilters();
}

/* ========= Modal Produto ========= */
let modalProduct = null;
function openModal(id){
  modalProduct = state.products.find(p=>p.id===id);
  if(!modalProduct) return;
  const b = $("#modalBody");
  b.innerHTML = `
    <div class="modal-grid">
      <div class="modal-thumb">${modalProduct.emoji}</div>
      <div>
        <h3 style="margin:0 0 8px">${modalProduct.name}</h3>
        <div style="color:var(--muted); margin-bottom:10px">${modalProduct.category} • ⭐ ${modalProduct.rating.toFixed(1)}</div>
        <div style="font-weight:800; font-size:20px; margin-bottom:12px">${fmt(modalProduct.price)}</div>
        <p style="margin:0; line-height:1.5">${modalProduct.desc}</p>
      </div>
    </div>
  `;
  $("#productModal").showModal();
}
function closeModal(){ $("#productModal").close(); }
$("#productModal")?.addEventListener("close", ()=>{ modalProduct=null; });
$("#modalAddBtn")?.addEventListener("click", ()=>{
  if(modalProduct){ addToCart(modalProduct.id); closeModal(); }
});

/* ========= Newsletter ========= */
function handleNewsletter(e){
  e.preventDefault();
  const email = $("#nlEmail").value.trim();
  const msg = $("#nlMsg");
  if(!email || !email.includes("@")){ msg.textContent = "Digite um e-mail válido."; return; }
  msg.textContent = "Obrigado! Cupom NUTRI10 aplicado no carrinho.";
  toast("Inscrição realizada. Cupom NUTRI10 aplicado!");
}

/* ========= Init ========= */
document.addEventListener("DOMContentLoaded", () => {
  // theme
  applyTheme();
  $("#themeToggle").addEventListener("click", ()=>{
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();
  });

  // year
  $("#year").textContent = new Date().getFullYear();

  // restore cart & render
  updateCartBadge(); renderCart();

  // simulate loading skeleton
  setTimeout(()=>{ applyFilters(); }, 450);

  // search
  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); state.query = $("#searchInput").value; applyFilters(); });
  $("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; applyFilters(); });

  // filters
  $("#categorySelect").addEventListener("change", (e) => { state.category = e.target.value; applyFilters(); });
  $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });
  $("#onlyFavs").addEventListener("change", (e) => { state.onlyFavs = e.target.checked; applyFilters(); });

  // cart
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);

  // checkout
  $("#checkoutBtn").addEventListener("click", () => {
    if(state.cart.length === 0) return;
    alert("Pedido enviado! (exemplo) — integre com seu checkout real aqui.");
  });

  // newsletter
  $("#nlForm").addEventListener("submit", handleNewsletter);
});
