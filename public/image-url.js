(() => {
  const safeImageUrl = (value) => {
    const url = String(value ?? "").trim();
    if (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) return url;
    if (/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(url)) return url;
    return "";
  };
  globalThis.MitinanImages = { safeImageUrl };
})();