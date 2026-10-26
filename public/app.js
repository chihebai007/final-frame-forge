import { readOffers, priceLine, changeCartOffer } from './pack-pricing.js';
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const LOAD_TIME = Date.now();
  function acquisitionSource() {
    let source = 'Accès direct';
    try {
      const url = new URL(window.top.location.href);
      const campaign = url.searchParams.get('utm_source');
      const ref = window.parent === window ? document.referrer : window.parent.document.referrer;
      if (campaign) source = campaign;
      else if (ref && new URL(ref).origin !== location.origin) source = new URL(ref).hostname;
      source = source.slice(0, 100);
      const previous = sessionStorage.getItem('mitinan_source');
      if (previous) return previous;
      sessionStorage.setItem('mitinan_source', source);
    } catch { /* Tracking is optional when browser storage is disabled. */ }
    return source;
  }
  const SOURCE = acquisitionSource();
  async function recordVisit() {
    if (navigator.doNotTrack === '1') return;
    try {
      if (sessionStorage.getItem('mitinan_visit_recorded')) return;
      const result = await fetch('/api/public/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: SOURCE, language: lang, device: matchMedia('(max-width: 650px)').matches ? 'Téléphone' : matchMedia('(max-width: 1000px)').matches ? 'Tablette' : 'Ordinateur' }) });
      if (result.ok) sessionStorage.setItem('mitinan_visit_recorded', '1');
    } catch { /* Never interrupt shopping if analytics is unavailable. */ }
  }
  let products = [], reviews = [], dbTexts = {};
  let currentFilter = "all";
  let reviewProduct = null, reviewRating = 5;
  let lang = localStorage.getItem("mitinan_lang") || "fr";
  if (!["fr", "ar", "en"].includes(lang)) lang = "fr";
  let cart = [];
  const selectedOffers = new Map();
  const packText = (key) => ({fr:{choose:'Choisissez votre offre',unit:'1 unité',pack:'Pack',saving:'de remise'},en:{choose:'Choose your offer',unit:'1 unit',pack:'Pack',saving:'discount'},ar:{choose:'اختر العرض',unit:'وحدة واحدة',pack:'حزمة',saving:'تخفيض'}}[lang][key]);
  const pricingFor = (p,q,id) => priceLine({...p,price:p.base_price},q,id);
  const availableOffers = p => p.packs_enabled ? readOffers(p.quantity_offers).filter(o => o.enabled) : [];
  const offerLabel = o => (lang !== 'fr' && o['label_'+lang]) || o.label || `${packText('pack')} ${o.quantity}`;
  try { cart = JSON.parse(localStorage.getItem("mitinan_cart_v2") || "[]"); if (!Array.isArray(cart)) cart = []; } catch { cart = []; }

  // 69 wilayas (découpage administratif 2025)
  const WILAYAS = ["Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa","Aflou","Barika","Ksar Chellala","Messaad","Aïn Oussera","Bou Saâda","El Abiodh Sidi Cheikh","El Kantara","Bir El Ater","Ksar El Boukhari","El Aricha"];

  // Traductions (FR = textes modifiables depuis l'administration)
  const I18N = {
    en: {
      nav_home:"Home",nav_story:"Our story",nav_terroir:"Terroir",nav_products:"Our products",nav_shop:"Shop",nav_awards:"Awards",nav_articles:"News",nav_contact:"Contact",
      order_btn:"Order",order_now:"Order now →",b1:"100% Natural",b1s:"Cold extraction",b2:"From the heart",b2s:"of Kabylia",b3:"Authentic product",b3s:"of Algeria",
      see_range:"See the full range →",olive_oil:"Olive oil",discover:"Discover →",more:"Learn more →",
      t1:"100% Natural",t1s:"No additives",t2:"Cold extraction",t2s:"Preserves the oil's qualities",t3:"Kabylia origin",t3s:"Exceptional terroir",t4:"Quality",t4s:"MITINAN standard",t5:"Product of Algeria",t5s:"Pride of the land",
      shop_eyebrow:"MITINAN SHOP",all:"All",loading:"Loading…",awards_eyebrow:"PRIZES & AWARDS",awards_title:"Our medals and trophies",awards_text:"MITINAN oil quality recognised at competitions and fairs.",
      contact_us:"Contact us →",journal:"MITINAN JOURNAL",sales:"Sales department",consumer:"Customer service",send:"Send",links:"Links",languages:"Languages",admin:"Administration",
      your_cart:"Your cart",total:"Total",checkout:"Checkout",checkout_title:"Order — cash on delivery",summary:"Order summary",dest_dz:"Algeria",dest_int:"International (on quote)",
      choose_wilaya:"Choose your wilaya",choose_commune:"Choose your town",choose_commune_first:"Choose the wilaya first",other_commune:"Other (type it)",confirm:"Confirm order",pay_note:"Cash on delivery — no online payment required.",pay_note_int:"International: we will contact you with a shipping quote before confirming.",
      leave_review:"Leave a review",send_review:"Post my review",
      ph_name:"Name",ph_message:"Your message",ph_first:"First name",ph_last:"Last name",ph_phone:"Phone",ph_email:"Email",subtotal:"Products subtotal",shipping:"Delivery",ship_home:"Home delivery",ship_desk:"Pick up at office",ship_choose:"choose your wilaya",ship_quote:"on quote",ship_none:"Delivery unavailable in this wilaya",ph_commune:"Town",ph_country:"Country",ph_address:"Delivery address",ph_comment:"Your opinion on this product",
      hero_eyebrow:"VIRGIN & EXTRA VIRGIN OLIVE OIL",hero_text:"An authentic olive oil, straight from the mountains of Kabylia. Cold extracted, 100% natural.",hero_button:"Discover our products →",
      products_title:"Our products",products_text:"A range of olive oils rooted in traditional know-how.",extra_title:"Extra Virgin",extra_text:"Intense taste, natural aromas, superior quality.",virgin_title:"Virgin",virgin_text:"An authentic flavour, both mild and fruity.",
      story_title:"A family tradition in the heart of Kabylia",story_text:"MITINAN was born from a passion: for our land, our olive trees and our heritage. Our ambition is to share an authentic, natural oil deeply tied to the mountains of Kabylia.",
      shop_title:"Our oils",cta_title:"Looking for a specific production?",cta_text:"Contact MITINAN for professional requests and volume needs.",articles_title:"Our news",articles_text:"Terroir, harvest, olive oil and brand life.",
      contact_title:"Let's talk about MITINAN",contact_text:"For individuals, retailers, wholesalers and partners.",contact_address:"Souk El Khamis, Bouira, Algeria",footer_copyright:"© 2026 MITINAN. All rights reserved.",
      add:"Add to cart",buy:"Order now",in_stock:"In stock",out:"Out of stock",reviews:"reviews",no_review:"No reviews yet",see_reviews:"Reviews",empty_cart:"Your cart is empty.",no_products:"No products available.",no_awards:"Our awards will be displayed here soon.",no_articles:"Articles coming soon.",
      max_stock:"Maximum stock reached for this product.",thanks_order:"Thank you! Your order #{n} has been recorded. We will call you to confirm delivery.",thanks_int:"Thank you! Your request #{n} has been recorded. We will contact you with a quote.",thanks_msg:"Thank you! Your message has been sent.",thanks_review:"Thank you! Your review will appear after validation.",err:"An error occurred, please try again.",net:"Connection failed, please try again.",
    },
    ar: {
      nav_home:"الرئيسية",nav_story:"قصتنا",nav_terroir:"الأرض",nav_products:"منتجاتنا",nav_shop:"المتجر",nav_awards:"الجوائز",nav_articles:"المقالات",nav_contact:"اتصل بنا",
      order_btn:"اطلب",order_now:"اطلب الآن ←",b1:"طبيعي 100%",b1s:"عصر على البارد",b2:"من قلب",b2s:"منطقة القبائل",b3:"منتج أصيل",b3s:"من الجزائر",
      see_range:"شاهد كل المنتجات ←",olive_oil:"زيت زيتون",discover:"اكتشف ←",more:"اعرف المزيد ←",
      t1:"طبيعي 100%",t1s:"بدون إضافات",t2:"عصر على البارد",t2s:"يحافظ على جودة الزيت",t3:"أصل القبائل",t3s:"أرض استثنائية",t4:"الجودة",t4s:"معايير ميتينان",t5:"منتج جزائري",t5s:"فخر الأرض",
      shop_eyebrow:"متجر ميتينان",all:"الكل",loading:"جار التحميل…",awards_eyebrow:"الجوائز والتكريمات",awards_title:"ميدالياتنا وكؤوسنا",awards_text:"جودة زيت ميتينان معترف بها في المسابقات والمعارض.",
      contact_us:"اتصل بنا ←",journal:"مجلة ميتينان",sales:"المصلحة التجارية",consumer:"خدمة المستهلك",send:"إرسال",links:"روابط",languages:"اللغات",admin:"الإدارة",
      your_cart:"سلتك",total:"المجموع",checkout:"إتمام الطلب",checkout_title:"الطلب — الدفع عند الاستلام",summary:"ملخص الطلب",dest_dz:"الجزائر",dest_int:"دولي (حسب عرض سعر)",
      choose_wilaya:"اختر ولايتك",choose_commune:"اختر بلديتك",choose_commune_first:"اختر الولاية أولاً",other_commune:"أخرى (اكتبها)",confirm:"تأكيد الطلب",pay_note:"الدفع عند الاستلام — لا يلزم أي دفع عبر الإنترنت.",pay_note_int:"دولي: سنتصل بك بعرض سعر الشحن قبل التأكيد.",
      leave_review:"شارك رأيك",send_review:"نشر رأيي",
      ph_name:"الاسم",ph_message:"رسالتك",ph_first:"الاسم",ph_last:"اللقب",ph_phone:"الهاتف",ph_email:"البريد الإلكتروني",subtotal:"مجموع المنتجات",shipping:"التوصيل",ship_home:"توصيل إلى المنزل",ship_desk:"الاستلام من المكتب",ship_choose:"اختر ولايتك",ship_quote:"حسب عرض السعر",ship_none:"التوصيل غير متوفر في هذه الولاية",ph_commune:"البلدية",ph_country:"البلد",ph_address:"عنوان التوصيل",ph_comment:"رأيك في هذا المنتج",
      hero_eyebrow:"زيت زيتون بكر وبكر ممتاز",hero_text:"زيت زيتون أصيل، مباشرة من جبال القبائل. معصور على البارد، طبيعي 100%.",hero_button:"اكتشف منتجاتنا ←",
      products_title:"منتجاتنا",products_text:"تشكيلة من زيوت الزيتون متجذرة في المعرفة التقليدية.",extra_title:"بكر ممتاز",extra_text:"طعم قوي، نكهات طبيعية، جودة عالية.",virgin_title:"بكر",virgin_text:"نكهة أصيلة، لطيفة وفاكهية.",
      story_title:"تقليد عائلي في قلب القبائل",story_text:"وُلدت ميتينان من شغف: بأرضنا وأشجار زيتوننا وتراثنا. طموحنا أن نشارككم زيتًا أصيلًا وطبيعيًا مرتبطًا بجبال القبائل.",
      shop_title:"زيوتنا",cta_title:"هل تبحث عن إنتاج خاص؟",cta_text:"تواصل مع ميتينان للطلبات المهنية والكميات الكبيرة.",articles_title:"أخبارنا",articles_text:"الأرض، الجني، زيت الزيتون وحياة العلامة.",
      contact_title:"لنتحدث عن ميتينان",contact_text:"للأفراد والموزعين وتجار الجملة والشركاء.",contact_address:"سوق الخميس، البويرة، الجزائر",footer_copyright:"© 2026 ميتينان. جميع الحقوق محفوظة.",
      add:"أضف إلى السلة",buy:"اطلب الآن",in_stock:"متوفر",out:"نفد المخزون",reviews:"آراء",no_review:"لا توجد آراء بعد",see_reviews:"الآراء",empty_cart:"سلتك فارغة.",no_products:"لا توجد منتجات.",no_awards:"ستعرض جوائزنا هنا قريبًا.",no_articles:"المقالات قريبًا.",
      max_stock:"تم بلوغ الحد الأقصى من المخزون لهذا المنتج.",thanks_order:"شكرًا! تم تسجيل طلبك رقم {n}. سنتصل بك لتأكيد التوصيل.",thanks_int:"شكرًا! تم تسجيل طلبك رقم {n}. سنتصل بك بعرض سعر.",thanks_msg:"شكرًا! تم إرسال رسالتك.",thanks_review:"شكرًا! سيظهر رأيك بعد المراجعة.",err:"حدث خطأ، يرجى المحاولة مرة أخرى.",net:"تعذر الاتصال، يرجى المحاولة مرة أخرى.",
    },
    fr: {
      add:"Ajouter au panier",buy:"Commander maintenant",in_stock:"Disponible",out:"Rupture de stock",reviews:"avis",no_review:"Pas encore d’avis",see_reviews:"Avis",empty_cart:"Votre panier est vide.",no_products:"Aucun produit disponible.",no_awards:"Nos distinctions seront bientôt affichées ici.",no_articles:"Les articles seront bientôt disponibles.",
      max_stock:"Stock maximum atteint pour ce produit.",thanks_order:"Merci ! Votre commande #{n} a été enregistrée. Nous vous appellerons pour confirmer la livraison.",thanks_int:"Merci ! Votre demande #{n} a été enregistrée. Nous vous contacterons avec un devis.",thanks_msg:"Merci ! Votre message a bien été envoyé.",thanks_review:"Merci ! Votre avis apparaîtra après validation.",err:"Une erreur est survenue, merci de réessayer.",net:"Connexion impossible, merci de réessayer.",
      choose_commune:"Choisissez votre commune",choose_commune_first:"Choisissez d’abord la wilaya",other_commune:"Autre (à saisir)",ph_commune:"Commune",subtotal:"Sous-total produits",shipping:"Livraison",ship_home:"Livraison à domicile",ship_desk:"Retrait au bureau",ship_choose:"choisissez votre wilaya",ship_quote:"sur devis",ship_none:"Livraison indisponible dans cette wilaya",ph_email:"Email",
      pay_note_int:"International : nous vous contacterons avec un devis de livraison avant confirmation.",
    },
  };
  const FR_ORIG = {};
  const tr = (k) => (I18N[lang] && I18N[lang][k]) || I18N.fr[k] || FR_ORIG[k] || k;

  const money = (n) => new Intl.NumberFormat("fr-DZ").format(Number(n) || 0) + (lang === "ar" ? " دج" : " DA");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const safeUrl = (u) => globalThis.MitinanImages.safeImageUrl(u);
  const photo = (url, alt = "") => safeUrl(url) ? `<img src="${esc(safeUrl(url))}" alt="${esc(alt)}" loading="lazy">` : "";
  const stars = (r) => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));
  const orderNo = (n) => "MIT-" + String(n).padStart(6, "0");

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  }

  // ---------- Langues ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-t]").forEach((el) => {
      const k = el.dataset.t;
      if (!(k in FR_ORIG)) FR_ORIG[k] = el.textContent;
      const v = lang === "fr" ? (dbTexts[k] && dbTexts[k].trim() ? dbTexts[k] : FR_ORIG[k]) : (I18N[lang][k] || dbTexts[k] || FR_ORIG[k]);
      el.textContent = v;
    });
    $$("[data-i]").forEach((el) => {
      const k = el.dataset.i;
      if (!(k in FR_ORIG)) FR_ORIG[k] = el.textContent;
      el.textContent = lang === "fr" ? FR_ORIG[k] : tr(k);
    });
    $$("[data-ph]").forEach((el) => {
      const k = el.dataset.ph;
      if (!(k in FR_ORIG)) FR_ORIG[k] = el.placeholder;
      el.placeholder = lang === "fr" ? FR_ORIG[k] : tr(k);
    });
    $$("[data-lang]").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
    updatePayNote();
    renderProducts();
    renderAwards();
    renderArticles();
    if ($("#wilaya").value) fillCommunes();
    if ($("#cartModal").classList.contains("show")) renderCart();
    if ($("#checkoutModal").classList.contains("show")) renderCheckout();
  }

  // ---------- Données ----------
  async function loadTexts() {
    try { dbTexts = await getJSON("/api/texts"); } catch (e) { console.warn("Textes non chargés", e); }
    $$('[data-image]').forEach((el) => {
      const key = el.dataset.image;
      if (!(key in dbTexts)) return;
      const url = globalThis.MitinanImages.safeImageUrl(dbTexts[key]);
      if (el.tagName === 'IMG') {
        el.hidden = !url;
        if (url) el.src = url;
        else el.removeAttribute('src');
      } else {
        el.style.setProperty('--section-image', url ? `url(${JSON.stringify(url)})` : 'none');
      }
    });
    $("#shipCompany").dataset.v = dbTexts.shipping_company || "";
    applyLang();
  }
  async function loadProducts() {
    try {
      const [p, r] = await Promise.all([getJSON("/api/products"), getJSON("/api/reviews").catch(() => [])]);
      products = p.map((x) => {
        const base = Number(x.price), sale = Number(x.sale_price);
        return sale > 0 && sale < base ? { ...x, base_price:base, price: sale, old_price: base, discount: Math.round((1 - sale / base) * 100) } : { ...x, base_price:base, price: base };
      });
      reviews = r;
    } catch (e) {
      console.warn(e);
      $("#productGrid").innerHTML = "<p>" + esc(tr("err")) + "</p>";
      return;
    }
    cart = cart.filter(i => {
      const p = products.find(p => p.id === i.product_id);
      if (!p) return false;
      try { const rule = pricingFor(p,i.quantity,i.offer_id || ''); i.quantity = Math.floor(Math.min(i.quantity,p.stock)/rule.step)*rule.step; return i.quantity > 0; } catch { return false; }
    });
    saveCart();
    renderProducts();
  }
  const pName = (p) => (lang !== "fr" && p["name_" + lang]) || p.name;
  const pDesc = (p) => (lang !== "fr" && p["description_" + lang]) || p.description;
  const productReviews = (id) => reviews.filter((r) => r.product_id === id);

  function renderProducts() {
    const grid = $("#productGrid");
    if (!products.length && grid.dataset.loaded !== "1") return;
    const list = currentFilter === "all" ? products : products.filter((p) => p.category === currentFilter);
    grid.innerHTML = list.map((p) => {
      const rv = productReviews(p.id);
      const avg = rv.length ? rv.reduce((s, r) => s + r.rating, 0) / rv.length : 0;
      return `<article class="product-card">
  ${safeUrl(p.image_url) ? `<div class="photo">${photo(p.image_url, pName(p))}</div>` : ""}
  <div class="body"><h3>${esc(pName(p))}</h3><div class="size">${esc(p.size)}</div>
  <button type="button" class="rating" data-reviews="${esc(p.id)}">${rv.length ? `<span class="stars">${stars(avg)}</span> ${avg.toFixed(1)} · ${rv.length} ${esc(tr("reviews"))}` : `<span class="stars dim">☆☆☆☆☆</span> ${esc(tr("no_review"))}`}</button>
  <p>${esc(pDesc(p))}</p><div class="stock">${esc(p.stock > 0 ? tr("in_stock") : tr("out"))}</div><div class="price">${p.old_price ? `<s class="old-price">${money(p.old_price)}</s> ${money(p.price)} <span class="discount-badge">-${p.discount}%</span>` : money(p.price)}</div>
  <div class="card-actions"><button type="button" class="btn gold" data-buy="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}>${esc(tr("buy"))}</button><button type="button" class="btn outline" data-add="${esc(p.id)}" ${p.stock < 1 ? "disabled" : ""}>${esc(tr("add"))}</button></div></div>
</article>`;
    }).join("") || "<p>" + esc(tr("no_products")) + "</p>";
    grid.dataset.loaded = "1";
  }

  let awards = null, articles = null;
  async function loadAwards() { try { awards = await getJSON("/api/awards"); } catch { awards = []; } renderAwards(); }
  function renderAwards() {
    if (!awards) return;
    $("#awardGrid").innerHTML = awards.map((a) => `<article class="award-card">${photo(a.image_url, a.title)}<div class="body">${a.year ? `<small>${esc(a.year)}</small>` : ""}<h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></div></article>`).join("") || `<p class="empty">${esc(tr("no_awards"))}</p>`;
  }
  async function loadArticles() { try { articles = await getJSON("/api/articles"); } catch { articles = []; } renderArticles(); }
  function renderArticles() {
    if (!articles) return;
    $("#articleGrid").innerHTML = articles.map((x) => `<article class="article-card">${photo(x.image_url, x.title)}<div class="body"><small>MITINAN</small><h3>${esc(x.title)}</h3><p>${esc(x.excerpt)}</p></div></article>`).join("") || "<p>" + esc(tr("no_articles")) + "</p>";
  }

  // ---------- Panier ----------
  function setFilter(f) {
    currentFilter = f;
    $$("#shopFilter button").forEach((x) => x.classList.toggle("active", x.dataset.filter === f));
    renderProducts();
  }
  function addToCart(id, silent) {
    const p = products.find((x) => x.id === id);
    if (!p || p.stock < 1) return false;
    const offer_id = selectedOffers.get(id) || '';
    const offer = availableOffers(p).find(o => o.id === offer_id);
    const step = offer ? offer.quantity : 1;
    const used = cart.filter(x => x.product_id === id).reduce((s,x) => s+x.quantity,0);
    if (used + step > p.stock || used + step > 100) { alert(tr('max_stock')); return false; }
    const i = cart.find((x) => x.product_id === id && (x.offer_id || '') === offer_id);
    if (i) {
      i.quantity += step;
    } else cart.push({ product_id: id, quantity: step, offer_id });
    saveCart();
    return true;
  }
  function saveCart() {
    localStorage.setItem("mitinan_cart_v2", JSON.stringify(cart));
    $("#cartCount").textContent = cart.reduce((s, i) => s + i.quantity, 0);
  }
  const showModal = (id) => { $$(".modal.show").forEach((m) => m.classList.remove("show")); $(id).classList.add("show"); };
  function openCart() { showModal("#cartModal"); renderCart(); }
  function cartLines() {
    let total = 0;
    const lines = cart.map((i) => {
      const p = products.find((x) => x.id === i.product_id);
      if (!p) return null;
      const pricing = pricingFor(p,i.quantity,i.offer_id || '');
      total += pricing.total;
      return { p, q: i.quantity, pricing, offer_id:i.offer_id || '' };
    }).filter(Boolean);
    return { lines, total };
  }
  function renderCart() {
    const { lines, total } = cartLines();
    $("#cartItems").innerHTML = lines.map(({ p, q, pricing, offer_id }) => `<div class="cart-row">${photo(p.image_url)}<div><b>${esc(pName(p))}</b><div>${esc(p.size)} · ${pricing.label ? esc(offerLabel(availableOffers(p).find(o => o.id === offer_id)))+' · ' : ''}${money(pricing.total)}</div></div><div class="qty"><button type="button" data-qty="-1" data-id="${esc(p.id)}" data-line-offer="${esc(offer_id)}" aria-label="-">−</button> ${q} <button type="button" data-qty="1" data-id="${esc(p.id)}" data-line-offer="${esc(offer_id)}" aria-label="+">+</button></div></div>`).join("") || "<p>" + esc(tr("empty_cart")) + "</p>";
    $("#cartTotal").textContent = money(total);
  }
  function changeQty(id, d, offer_id = '') {
    const i = cart.find((x) => x.product_id === id && (x.offer_id || '') === offer_id);
    const p = products.find((x) => x.id === id);
    if (!i || !p) return;
    const step = pricingFor(p,i.quantity,offer_id).step;
    const used = cart.filter(x => x.product_id === id).reduce((s,x) => s+x.quantity,0);
    if (d > 0 && (used + step > p.stock || used + step > 100)) return alert(tr("max_stock"));
    i.quantity += d * step;
    if (i.quantity <= 0) cart = cart.filter((x) => x !== i);
    saveCart();
    renderCart();
  }
  function openCheckout() {
    if (!cart.length) return alert(tr("empty_cart"));
    renderCheckout();
    showModal("#checkoutModal");
    loadRates().then(updateShipping);
  }
  function renderCheckout() {
    const { lines, total } = cartLines();
    $("#summaryItems").innerHTML = lines.map(({ p, q, pricing }) => `<div class="sum-row"><span>${q} × ${esc(pName(p))} <small>${esc(p.size)} ${esc(pricing.label)}</small></span><b>${money(pricing.total)}</b></div>`).join("");
    $("#summarySub").textContent = money(total);
    $("#checkoutOffers").innerHTML = lines.map(({p, q, pricing, offer_id}, index) => {
      const offers = availableOffers(p);
      if (!offers.length) return '';
      const count = q / pricing.step;
      const otherQuantity = cart.filter((line, i) => i !== index && line.product_id === p.id).reduce((sum,line) => sum + line.quantity,0);
      const options = [{id:'',quantity:1,price:p.price,label:packText('unit')},...offers];
      return `<fieldset class="quantity-offers checkout-offers"><legend>${esc(packText('choose'))} — ${esc(pName(p))}</legend>${options.map(o => {
        const badge = (lang !== 'fr' && o['badge_'+lang]) || o.badge || '';
        const saving = Math.max(0,p.price*o.quantity-o.price);
        const disabled = otherQuantity + count * o.quantity > Math.min(p.stock,100);
        return `<label class="offer-choice"><input type="radio" name="checkout-offer-${index}" data-checkout-line="${index}" value="${esc(o.id)}" ${offer_id === o.id ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${esc(o.id ? offerLabel(o) : o.label)}${badge ? `<small class="offer-badge">${esc(badge)}</small>` : ''}</span><span class="offer-amount"><b>${money(o.price)}</b>${saving > 0 ? `<small>${money(saving)} ${esc(packText('saving'))}</small>` : ''}</span></label>`;
      }).join('')}${count > 1 ? `<div class="checkout-offer-count">${count} × ${esc(packText('choose'))} · ${q} ${esc(packText('unit'))} · ${money(pricing.total)}</div>` : ''}</fieldset>`;
    }).join('');
    updateShipping();
  }
  let RATES = null;
  async function loadRates() { if (!RATES) { try { RATES = await getJSON("/api/shipping"); } catch { RATES = []; } } }
  function updateShipping() {
    const f = $("#checkoutForm"), { total } = cartLines();
    const intl = f.destination.value === "international";
    const r = (RATES || []).find((x) => x.wilaya_code === parseInt(f.wilaya.value, 10));
    const desk = r ? Number(r.desk_price) : 0, home = r ? Number(r.home_price) : 0;
    $("#priceHome").textContent = r ? money(home) : "";
    $("#priceDesk").textContent = r && desk ? money(desk) : "";
    $("#deskLabel").hidden = !!r && !desk;
    if (r && !desk && f.delivery_type.value === "bureau") f.delivery_type.value = "domicile";
    const company = $("#shipCompany").dataset.v || "";
    $("#shipCompany").textContent = company ? "(" + company + ")" : "";
    let fee = null, label;
    if (intl) label = tr("ship_quote");
    else if (!r) label = tr("ship_choose");
    else if (!r.available) label = tr("ship_none");
    else { fee = f.delivery_type.value === "bureau" ? desk : home; label = money(fee); }
    $("#summaryShip").textContent = label;
    $("#summaryTotal").textContent = money(total + (fee || 0));
  }
  function updatePayNote() {
    const intl = $("#checkoutForm").destination.value === "international";
    $$(".dz-only").forEach((el) => { el.hidden = intl; el.querySelectorAll("input,select").forEach((x) => (x.required = !intl)); });
    $$(".int-only").forEach((el) => { el.hidden = !intl; el.required = intl; });
    $("#payNote").textContent = intl ? tr("pay_note_int") : (lang === "fr" ? FR_ORIG.pay_note || $("#payNote").textContent : tr("pay_note"));
  }

  // ---------- Avis ----------
  function renderStarsInput() {
    $("#starsInput").innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= reviewRating ? "on" : ""}" aria-label="${n}">★</button>`).join("");
  }
  function openReviews(id) {
    reviewProduct = products.find((p) => p.id === id);
    if (!reviewProduct) return;
    $("#reviewTitle").textContent = tr("see_reviews") + " — " + pName(reviewProduct);
    const rv = productReviews(id);
    $("#reviewList").innerHTML = rv.map((r) => `<div class="review"><div><b>${esc(r.name)}</b> <span class="stars">${stars(r.rating)}</span></div><p>${esc(r.comment)}</p><small>${new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR")}</small></div>`).join("") || `<p class="empty">${esc(tr("no_review"))}</p>`;
    reviewRating = 5;
    renderStarsInput();
    showModal("#reviewModal");
  }

  // ---------- Événements ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.add) { if (addToCart(t.dataset.add)) openCart(); }
    else if (t.dataset.buy) { if (addToCart(t.dataset.buy, true)) openCheckout(); }
    else if (t.dataset.reviews) openReviews(t.dataset.reviews);
    else if (t.dataset.star) { reviewRating = Number(t.dataset.star); renderStarsInput(); }
    else if (t.dataset.qty) changeQty(t.dataset.id, Number(t.dataset.qty),t.dataset.lineOffer || '');
    else if (t.dataset.filter) setFilter(t.dataset.filter);
    else if (t.dataset.filterLink) setFilter(t.dataset.filterLink);
    else if (t.dataset.lang) { lang = t.dataset.lang; localStorage.setItem("mitinan_lang", lang); applyLang(); }
    else if ("close" in t.dataset) t.closest(".modal").classList.remove("show");
    if (t.closest("#mainNav")) toggleMenu(false);
  });
  const toggleMenu = (open) => { document.body.classList.toggle("menu-open", open); $("#burger").setAttribute("aria-expanded", String(open)); };
  document.addEventListener('change',e => {
    if (e.target.dataset.offerProduct) selectedOffers.set(e.target.dataset.offerProduct,e.target.value);
    if (e.target.dataset.checkoutLine !== undefined) {
      const index = Number(e.target.dataset.checkoutLine);
      const line = cart[index];
      const p = line && products.find(p => p.id === line.product_id);
      if (!p) return;
      try {
        cart = changeCartOffer(cart,{...p,price:p.base_price},index,e.target.value);
        saveCart();
      } catch { alert(tr('max_stock')); }
      renderCheckout();
    }
  });
  $("#burger").onclick = (e) => { e.stopPropagation(); toggleMenu(!document.body.classList.contains("menu-open")); };
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("show"); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $$(".modal.show").forEach((m) => m.classList.remove("show")); toggleMenu(false); } });
  $("#cartBtn").onclick = openCart;
  $("#checkoutBtn").onclick = openCheckout;
  $("#checkoutForm").addEventListener("change", (e) => { if (e.target.name === "destination") updatePayNote(); if (["destination","wilaya","delivery_type"].includes(e.target.name)) updateShipping(); });
  let COMMUNES = null;
  const OTHER = "__autre";
  async function fillCommunes() {
    const sel = $("#commune"), w = $("#wilaya").value;
    const code = w.slice(0, 2);
    $("#communeOther")?.remove();
    if (!w) { sel.disabled = true; sel.innerHTML = `<option value="">${esc(tr("choose_commune_first"))}</option>`; return; }
    if (!COMMUNES) { try { COMMUNES = await getJSON("/communes.json"); } catch { COMMUNES = {}; } }
    const list = COMMUNES[code] || [];
    sel.disabled = false;
    sel.innerHTML = `<option value="">${esc(tr("choose_commune"))}</option>` + list.map(([fr, ar]) => `<option value="${esc(fr)}">${esc(lang === "ar" ? ar : fr)}</option>`).join("") + `<option value="${OTHER}">${esc(tr("other_commune"))}</option>`;
  }
  $("#wilaya").addEventListener("change", fillCommunes);
  $("#commune").addEventListener("change", (e) => {
    $("#communeOther")?.remove();
    if (e.target.value === OTHER) e.target.insertAdjacentHTML("afterend", `<input id="communeOther" name="commune_other" required maxlength="100" placeholder="${esc(tr("ph_commune"))}">`);
  });
  $("#wilaya").insertAdjacentHTML("beforeend", WILAYAS.map((w, i) => `<option value="${esc(String(i + 1).padStart(2, "0") + " - " + w)}">${String(i + 1).padStart(2, "0")} - ${esc(w)}</option>`).join(""));

  async function post(url, body) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || tr("err")), { user: true });
    return d;
  }
  function handleForm(form, fn) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button:not([type=button])");
      if (btn.disabled) return;
      btn.disabled = true;
      try { await fn(Object.fromEntries(new FormData(form))); }
      catch (err) { alert(err.user ? err.message : tr("net")); }
      finally { btn.disabled = false; }
    };
  }
  handleForm($("#checkoutForm"), async (body) => {
    body.acquisition_source = SOURCE;
    body.items = cart;
    if (body.commune === OTHER) body.commune = body.commune_other || "";
    delete body.commune_other;
    if (body.destination === "international") { body.wilaya = ""; body.commune = ""; }
    const d = await post("/api/orders", body);
    alert(tr(body.destination === "international" ? "thanks_int" : "thanks_order").replace("{n}", orderNo(d.order_number)));
    cart = []; saveCart(); $("#checkoutForm").reset(); fillCommunes(); updatePayNote();
    $("#checkoutModal").classList.remove("show");
    loadProducts();
  });
  handleForm($("#contactForm"), async (body) => {
    await post("/api/contact", { ...body, t: Date.now() - LOAD_TIME });
    alert(tr("thanks_msg"));
    $("#contactForm").reset();
  });
  handleForm($("#reviewForm"), async (body) => {
    if (!reviewProduct) return;
    await post("/api/reviews", { ...body, product_id: reviewProduct.id, rating: reviewRating });
    alert(tr("thanks_review"));
    $("#reviewForm").reset();
    $("#reviewModal").classList.remove("show");
  });

  saveCart();
  recordVisit();
  loadTexts();
  loadProducts();
  loadAwards();
  loadArticles();
})();
