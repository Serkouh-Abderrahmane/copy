(function() {
  const SLIDESHOW_SECTION = 'template--23956493893952__1621243260e1af0c20';

  fetch('/api/products/homepage')
    .then(r => r.json())
    .then(data => {
      if (!data || data.error) return;

      const slideshow = document.getElementById('shopify-section-' + SLIDESHOW_SECTION);
      if (slideshow && data.banners && data.banners.length > 0) {
        const slides = slideshow.querySelectorAll('[data-slide]');
        data.banners.forEach((banner, i) => {
          if (i >= slides.length) return;
          const img = slides[i].querySelector('img');
          if (img && banner.image) {
            let src = banner.image.startsWith('http') ? banner.image : '/' + banner.image.replace(/^\//, '');
            img.src = src;
            img.removeAttribute('srcset');
          }
          const link = slides[i].querySelector('a');
          if (link && banner.link) {
            link.href = banner.link;
          }
        });
      }
    })
    .catch(() => {});
})();
