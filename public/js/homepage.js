(function() {
  if (window.__homepageLoaded) return;
  var mainContent = document.querySelector('[data-homepage="true"]');
  if (!mainContent) return;

  window.__homepageLoaded = true;

  var SITE_URL = '/';

  function imgUrl(src) {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    if (src.startsWith('/')) return src;
    return '/' + src;
  }

  function formatPrice(num) {
    return Number(num).toLocaleString('vi-VN') + '₫';
  }

  function calcDiscount(price, comparePrice) {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round((1 - price / comparePrice) * 100);
  }

  function loadHomepage() {
    fetch('/api/homepage')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        mainContent.innerHTML = '';
        if (data.slideshow && data.slideshow.slides && data.slideshow.slides.length) {
          mainContent.appendChild(buildSlideshow(data.slideshow.slides));
        }
        if (data.collection_list && data.collection_list.collections && data.collection_list.collections.length) {
          mainContent.appendChild(buildCollectionList(data.collection_list.collections));
        }
        if (data.featured_products && data.featured_products.products && data.featured_products.products.length) {
          mainContent.appendChild(buildProductSection(data.featured_products.products, 'Sản phẩm nổi bật', 'featured'));
        }
        if (data.new_arrivals && data.new_arrivals.products && data.new_arrivals.products.length) {
          mainContent.appendChild(buildProductSection(data.new_arrivals.products, 'Hàng mới về', 'new-arrivals'));
        }
        initSliders();
        window.dispatchEvent(new Event('resize'));
      })
      .catch(function() {
        mainContent.innerHTML = '<div style="text-align:center;padding:60px 20px"><p>Đang tải...</p></div>';
      });
  }

  function buildSlideshow(slides) {
    var section = document.createElement('div');
    section.className = 'shopify-section';
    section.innerHTML = 
      '<link href="cdn/shop/t/4/assets/slideshowd3f3.css?v=45729299094500379561740233661" rel="stylesheet" type="text/css" media="all" />' +
      '<section id="m-slider-homepage" class="m-section m-slider m-slideshow-section m-slider--adapt m-slider--content-stack sf-home__slideshow" data-section-type="slider" data-section-id="homepage" style="--data-autoplay-speed: 4s;">' +
      '<div class="container-full">' +
      '<m-slideshow class="m:block m-slider-controls--show-pagination m-slider-controls--pagination-right" data-id="homepage" data-autoplay="true" data-autoplay-speed="4" data-enable-arrows="false" data-enable-dots="true" data-slide-height="adapt">' +
      '<div class="swiper-container"><div class="swiper-wrapper">' +
      slides.map(function(s, i) {
        var img = imgUrl(s.image);
        var link = s.link || '#';
        return '<div data-slide="' + i + '" class="swiper-slide" data-slide-type="slider_item">' +
          '<div class="m-slide m-slide--middle-left m-slide--text-large' + (link !== '#' ? ' m-slide--has-link' : '') + '">' +
          '<div class="m-slide__media" style="--aspect-ratio: 2.1333333333333333; --aspect-ratio-mobile: 2.1333333333333333">' +
          (link !== '#' ? '<a href="' + link + '" class="m-hidden-link"></a>' : '') +
          '<div class="m-slide__bg"><picture>' +
          (img ? '<img src="' + img + '" alt="' + (s.title || 'slide') + '" width="4000" height="1875" loading="' + (i === 0 ? 'eager' : 'lazy') + '" fetchpriority="' + (i === 0 ? 'high' : 'low') + '" sizes="100vw">' : '') +
          '</picture></div></div></div></div>';
      }).join('') +
      '</div></div>' +
      '<div class="m-slider-controls m-slider-controls--absolute m-slider-controls--show-pagination m-slider-controls--pagination-right m-slider-controls--middle-right" style="--swiper-controls-color: #222222;"><div class="m-slider-controls__wrapper"><div class="swiper-pagination m:w-full m-dot-circle m-dot-circle--dark swiper-pagination--vertical"></div></div></div>' +
      '</m-slideshow></div></section>';
    return section;
  }

  function buildCollectionList(collections) {
    var section = document.createElement('div');
    section.className = 'shopify-section';
    var rows = collections.map(function(c, i) {
      var img = imgUrl(c.image);
      var href = '/collections/' + c.slug;
      return '<div class="m:column swiper-slide">' +
        '<div class="m-collection-card m-collection-card--inside m-scroll-trigger animate--fade-in" data-cascade style="--animation-order: ' + (i + 1) + ';">' +
        '<div class="m-collection-card__inner m-hover-box m-hover-box--scale-up">' +
        '<a href="' + href + '" class="m-collection-card__image m:block m:w-full m:blocks-radius" aria-label="' + (c.name || '') + '">' +
        '<div class="m-hover-box__wrapper">' +
        '<responsive-image class="m-image" style="--aspect-ratio: 1.0;">' +
        (img ? '<img src="' + img + '?width=360" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)" alt="" class="m:w-full" width="1024" height="1024" loading="lazy">' : '') +
        '</responsive-image></div></a>' +
        '<div class="m-collection-card__info m:text-left">' +
        '<h3 class="m-collection-card__title"><a class="m-collection-card__link m:block" href="' + href + '">' + (c.name || '') + '</a></h3>' +
        (c.product_count !== undefined ? '<p class="m-collection-card__product-count">' + c.product_count + ' mục</p>' : '') +
        '<a class="m-button m-button--white m:justify-center m:items-center" href="' + href + '" aria-label="' + (c.name || '') + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" fill="none" viewBox="0 0 14 13"><path fill="currentColor" d="M6.78594.789062c.16406-.145833.31901-.145833.46484 0L12.9656 6.53125c.1641.14583.1641.29167 0 .4375L7.25078 12.7109c-.14583.1459-.30078.1459-.46484 0l-.54688-.5468c-.05469-.0547-.08203-.1276-.08203-.2188 0-.0911.02734-.1732.08203-.2461l4.23824-4.23826H1.15312c-.218745 0-.32812-.10938-.32812-.32813v-.76562c0-.21875.109375-.32813.32812-.32813h9.32418L6.23906 1.80078c-.14583-.16406-.14583-.31901 0-.46484l.54688-.546878z"/></svg></a></div></div></div></div>';
    }).join('');

    section.innerHTML =
      '<link href="cdn/shop/t/4/assets/component-collection-card9229.css?v=109177214257835540641740233661" rel="stylesheet" type="text/css" media="all" />' +
      '<link href="cdn/shop/t/4/assets/collection-list004d.css?v=22520980523807214251740233660" rel="stylesheet" type="text/css" media="all" />' +
      '<section id="m-collection-list-homepage" class="m-section m-collection-list m-collection-list--grid sf-home__collection-list m-gradient m-color-default" data-section-type="collection-list" data-section-id="homepage" style="--section-padding-top: 100px; --section-padding-bottom: 0px;">' +
      '<div class="m-collection-list__container m-section-my m-section-py" style="--column-gap: 40px; --column-gap-mobile: 16px; --row-gap-mobile: 16px; --row-gap: 40px; --items: 4">' +
      '<m-collection-list data-enable-slider="true" data-mobile-disable-slider="false" data-mobile-hide-controls="false" data-gutter="40" data-items="3" data-autoplay="false" data-autoplay-speed="4" data-pagination-type="fraction" data-show-controls="true" data-expanded="true" data-total="' + collections.length + '" class="m-collection-list__wrapper m:block">' +
      '<div class="m-collection-list__header-container container-fluid">' +
      '<div class="m-section__header m:text-left">' +
      '<h2 class="m-section__heading h3 m-scroll-trigger animate--fade-in">Khám phá các bộ sưu tập</h2>' +
      '<div class="m-section__button m-scroll-trigger animate--fade-in">' +
      '<a class="m-button m-button--primary" href="/collections">Xem thêm</a></div>' +
      '<div class="m-collection-list__controls m-collection-list__controls--top">' +
      '<div class="m-slider-controls m-slider-controls--bottom-left m-slider-controls--show-nav m-slider-controls--show-pagination m-slider-controls--pagination-fraction m-slider-controls--group">' +
      '<div class="m-slider-controls__wrapper">' +
      '<button class="m-slider-controls__button m-slider-controls__button-prev swiper-button-prev" aria-label="Previous">' +
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="swiper-pagination m:w-full m-dot-circle m-dot-circle--dark"></div>' +
      '<button class="m-slider-controls__button m-slider-controls__button-next swiper-button-next" aria-label="Next">' +
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div></div></div></div>' +
      '<div class="m-collection-list__content-container container-full">' +
      '<div class="m-collection-list__content"><div class="m-mixed-layout"><div class="m-mixed-layout__wrapper swiper-container swiper--equal-height"><div class="m-mixed-layout__inner m:grid md:m:grid-3-cols xl:m:grid-3-cols swiper-wrapper">' +
      rows +
      '</div></div></div></div></div></m-collection-list></div></section>';
    return section;
  }

  function buildProductCard(p, i) {
    var price = p.sale_price || p.price;
    var comparePrice = p.compare_price || p.price;
    var pct = calcDiscount(price, comparePrice);
    var images = p.images || [];
    var img = images[0] || '';
    var hoverImg = images.length > 1 ? images[1] : '';
    var imgSrc = imgUrl(img);
    var hoverSrc = imgUrl(hoverImg);
    var showSale = pct > 0;
    var hasHover = images.length > 1;
    var showSoldOut = p.stock !== undefined && p.stock <= 0;

    return '<div class="swiper-slide m:column">' +
      '<div class="m-product-card m-product-card--style-1' + (showSale ? ' m-product-card--onsale' : '') + (hasHover ? ' m-product-card--show-second-img' : '') + ' m-scroll-trigger animate--fade-in" data-view="card" data-product-id="' + p.id + '" data-cascade style="--animation-order: ' + (i + 1) + ';">' +
      '<div class="m-product-card__media">' +
      '<a class="m-product-card__link m:block m:w-full" href="/products/' + p.slug + '" aria-label="' + (p.name || '') + '">' +
      '<div class="m-product-card__main-image">' +
      '<responsive-image class="m-image" style="--aspect-ratio: 0.75">' +
      (imgSrc ? '<img src="' + imgSrc + '" alt="' + (p.name || '') + '" width="400" height="533" fetchpriority="low" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)">' : '<div style="background:#f3f3f3;width:100%;padding-bottom:133%"></div>') +
      '</responsive-image></div>' +
      (hasHover ? '<div class="m-product-card__hover-image"><responsive-image class="m-image" style="--aspect-ratio: 0.75">' +
      (hoverSrc ? '<img src="' + hoverSrc + '" alt="' + (p.name || '') + '" width="400" height="533" class="m:w-full m:h-full" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)">' : '') +
      '</responsive-image></div>' : '') +
      '</a>' +
      (showSale ? '<div class="m-product-card__tags"><span class="m-product-card__tag-name m-product-tag m-product-tag--sale m-gradient m-color-badge-sale">-' + pct + '%</span></div>' : '') +
      '<span class="m-product-tag m-product-tag--soldout m-gradient m-color-footer" style="display: ' + (showSoldOut ? 'flex' : 'none') + ';">Bán hết</span>' +
      '<div class="m-product-card__action m:hidden lg:m:block"></div></div>' +
      '<div class="m-product-card__content m:text-left"><div class="m-product-card__info">' +
      '<h3 class="m-product-card__title"><a href="/products/' + p.slug + '" class="m-product-card__name">' + (p.name || '') + '</a></h3>' +
      '<div class="m-product-card__price"><div class="m-price m:inline-flex m:items-center m:flex-wrap' + (showSale ? ' m-price--on-sale' : '') + '" data-sale-badge-type="percentage">' +
      '<div class="m-price__regular"><span class="m:visually-hidden m:visually-hidden--inline">Giá cả phải chăng</span><span class="m-price-item m-price-item--regular">' + formatPrice(price) + '</span></div>' +
      (showSale ? '<div class="m-price__sale"><span class="m:visually-hidden m:visually-hidden--inline">Giá bán</span><span class="m-price-item m-price-item--sale m-price-item--last">' + formatPrice(price) + '</span><span class="m-price-item m-price-item--compare">' + formatPrice(comparePrice) + '</span></div>' : '') +
      '</div></div></div></div></div></div>';
  }

  function buildProductSection(products, title, sectionId) {
    var rows = products.map(function(p, i) { return buildProductCard(p, i); }).join('');
    var section = document.createElement('div');
    section.className = 'shopify-section';
    section.innerHTML =
      '<link href="cdn/shop/t/4/assets/component-product-inventory33f4.css?v=111082497872923960041740233661" rel="stylesheet" type="text/css" media="all" />' +
      '<section id="m-featured-' + sectionId + '" class="m-section m-gradient m-color-default" style="--section-padding-top: 60px; --section-padding-bottom: 0px;">' +
      '<div class="container-fluid">' +
      '<div class="m-section__header m:text-left"><h2 class="m-section__heading h2 m-scroll-trigger animate--fade-in">' + title + '</h2></div>' +
      '<div class="m-mixed-layout"><div class="m-mixed-layout__wrapper"><div class="m-mixed-layout__inner m:grid md:m:grid-4-cols lg:m:grid-4-cols xl:m:grid-4-cols">' +
      rows +
      '</div></div></div></div></section>';
    return section;
  }

  function initSliders() {
    if (window.MinimogTheme && window.MinimogTheme.Slider) {
      document.querySelectorAll('m-slideshow, m-collection-list').forEach(function(el) {
        try { window.MinimogTheme.Slider.init(el); } catch(e) {}
      });
    }
    document.querySelectorAll('.swiper-container').forEach(function(el) {
      if (el.swiper) return;
      if (window.Swiper) {
        try {
          new window.Swiper(el, {
            loop: true,
            autoplay: el.closest('[data-autoplay="true"]') ? { delay: 4000 } : false,
            pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
            navigation: {
              nextEl: el.closest('section').querySelector('.swiper-button-next'),
              prevEl: el.closest('section').querySelector('.swiper-button-prev')
            },
            breakpoints: { 320: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
          });
        } catch(e) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHomepage);
  } else {
    loadHomepage();
  }
})();
