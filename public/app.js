(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const FALLBACK_IMG = "/images/IMG-20260706-WA0064.jpg";
  let products = [];
  let currentFilter = "all";
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("mitinan_cart_v2") || "[]");
    if (!Array.isArray(cart)) cart = [];
  } catch { cart = []; }

  const money = (n) => new Intl.NumberFormat("fr-DZ").format(Number(n) || 0) + " DA";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const safeUrl = (u) => (/^(https?:\/\/|\/)/i.test(String(u || "")) ? String(u) : FALLBACK_IMG);

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  }

  async function loadTexts() {
    try {
      const t = await getJSON("/api/texts");
      document.querySelectorAll("[data-t]").forEach((el) => {
        const v = t[el.dataset.t];
        if (typeof v === "string" && v.trim()) el.textContent = v;
      });
    } catch (e) { console.warn("Textes non chargés", e); }
  }

  async function loadProducts() {
    try {
      products = await getJSON("/api/products");
    } catch (e) {
      console.warn(e);
      $("#productGrid").innerHTML = "<p>Impossible de charger les produits pour le moment.</p>";
      return;
    }
    // Remove cart lines for products no longer for sale, cap quantities at stock.
    cart = cart.filter((i) => products.some((p) => p.id === i.product_id))
      .map((i) => ({ ...i, quantity: Math.min(i.quantity, products.find((p) => p.id === i.product_id).stock) }))
      .filter((i) => i.quantity > 0);
    saveCart();
    renderProducts();
  }

  function renderProducts() {
    const grid = $("#productGrid");
    const list = currentFilter === "all" ? products : products.filter((p) => p.category === currentFilter);
    grid.innerHTML = list.map((p) => `
<article class="product-card">
  <div class="photo"><img src="${esc(safeUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="body"><h3>${esc(p.name)}</h3><div class="size">${esc(p.size)}</div><p>${esc(p.description)}</p><div class="stock">${p.stock > 0 ? "Disponible" : "Rupture de stock"}</div><div class="price">${money(p.price)}</div><button type="button" class="btn gold" data-add="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}>Ajouter au panier</button></div>
</article>`).join("") || "<p>Aucun produit disponible.</p>";
  }

  function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll("#shopFilter button").forEach((x) => x.classList.toggle("active", x.dataset.filter === f));
    renderProducts();
  }

  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p || p.stock < 1) return;
    const i = cart.find((x) => x.product_id === id);
    if (i) {
      if (i.quantity >= p.stock) return alert("Stock maximum atteint pour ce produit.");
      i.quantity++;
    } else cart.push({ product_id: id, quantity: 1 });
    saveCart();
    openCart();
  }

  function saveCart() {
    localStorage.setItem("mitinan_cart_v2", JSON.stringify(cart));
    $("#cartCount").textContent = cart.reduce((s, i) => s + i.quantity, 0);
  }

  function openCart() { $("#cartModal").classList.add("show"); renderCart(); }

  function renderCart() {
    let total = 0;
    $("#cartItems").innerHTML = cart.map((i) => {
      const p = products.find((x) => x.id === i.product_id);
      if (!p) return "";
      total += p.price * i.quantity;
      return `<div class="cart-row"><img src="${esc(safeUrl(p.image_url))}" alt=""><div><b>${esc(p.name)}</b><div>${esc(p.size)} · ${money(p.price)}</div></div><div><button type="button" data-qty="-1" data-id="${esc(p.id)}" aria-label="Retirer un">−</button> ${i.quantity} <button type="button" data-qty="1" data-id="${esc(p.id)}" aria-label="Ajouter un">+</button></div></div>`;
    }).join("") || "<p>Votre panier est vide.</p>";
    $("#cartTotal").textContent = money(total);
  }

  function changeQty(id, d) {
    const i = cart.find((x) => x.product_id === id);
    const p = products.find((x) => x.id === id);
    if (!i || !p) return;
    if (d > 0 && i.quantity >= p.stock) return alert("Stock maximum atteint pour ce produit.");
    i.quantity += d;
    if (i.quantity <= 0) cart = cart.filter((x) => x.product_id !== id);
    saveCart();
    renderCart();
  }

  async function loadArticles() {
    try {
      const a = await getJSON("/api/articles");
      $("#articleGrid").innerHTML = a.map((x) => `<article class="article-card"><img src="${esc(x.image_url ? safeUrl(x.image_url) : "/images/IMG-20260706-WA0062.jpg")}" alt="${esc(x.title)}" loading="lazy"><div class="body"><small>MITINAN</small><h3>${esc(x.title)}</h3><p>${esc(x.excerpt)}</p></div></article>`).join("") || "<p>Les articles seront bientôt disponibles.</p>";
    } catch (e) {
      console.warn(e);
      $("#articleGrid").innerHTML = "<p>Les articles seront bientôt disponibles.</p>";
    }
  }

  // Events (delegated — no inline handlers)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.add) addToCart(t.dataset.add);
    else if (t.dataset.qty) changeQty(t.dataset.id, Number(t.dataset.qty));
    else if (t.dataset.filter) setFilter(t.dataset.filter);
    else if (t.dataset.filterLink) setFilter(t.dataset.filterLink);
    else if (t.dataset.lang && t.dataset.lang !== "FR") alert("La version " + t.dataset.lang + " sera bientôt disponible.");
  });
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("show"); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal.show").forEach((m) => m.classList.remove("show")); });
  $("#cartBtn").onclick = openCart;
  $("#closeCart").onclick = () => $("#cartModal").classList.remove("show");
  $("#closeCheckout").onclick = () => $("#checkoutModal").classList.remove("show");
  $("#checkoutBtn").onclick = () => {
    if (!cart.length) return alert("Votre panier est vide.");
    $("#cartModal").classList.remove("show");
    $("#checkoutModal").classList.add("show");
  };

  $("#checkoutForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(e.target));
      body.items = cart;
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return alert(d.error || "Une erreur est survenue, merci de réessayer.");
      alert("Merci ! Votre commande #MIT-" + String(d.order_number).padStart(6, "0") + " a été enregistrée. Nous vous appellerons pour confirmer la livraison.");
      cart = [];
      saveCart();
      e.target.reset();
      $("#checkoutModal").classList.remove("show");
      loadProducts();
    } catch {
      alert("Connexion impossible, merci de réessayer.");
    } finally {
      btn.disabled = false;
    }
  };

  $("#contactForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return alert(d.error || "Erreur, merci de réessayer.");
      alert("Merci ! Votre message a bien été envoyé.");
      e.target.reset();
    } catch {
      alert("Connexion impossible, merci de réessayer.");
    } finally {
      btn.disabled = false;
    }
  };

  saveCart();
  loadTexts();
  loadProducts();
  loadArticles();
})();
