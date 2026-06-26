(function () {
  'use strict';

  const mainContent = document.querySelector('main[role="main"]');
  if (!mainContent || mainContent.dataset.product !== 'true') return;

  async function loadProduct() {
    const slug = window.location.pathname.replace(/^\/products\//, '').replace(/\.html$/, '').replace(/\/$/, '');
    document.title = 'Đang tải... | Luôn Vui Tươi';

    try {
      const res = await fetch('/api/products/' + encodeURIComponent(slug));
      if (!res.ok) throw new Error('Product not found');
      const data = await res.json();
      renderProduct(data);
    } catch (e) {
      mainContent.innerHTML = '<div class="container" style="text-align:center;padding:100px 20px"><h1 style="font-size:1.5rem;margin-bottom:12px">Không tìm thấy sản phẩm</h1><p style="color:#999">Sản phẩm này hiện không có sẵn hoặc đã bị xóa.</p><a href="/" class="m-button m-button--primary" style="display:inline-block;margin-top:20px;padding:10px 30px">Quay lại trang chủ</a></div>';
    }
  }

  function renderProduct(data) {
    const product = data.product;
    const images = Array.isArray(product.images) ? product.images : (product.images ? JSON.parse(product.images) : []);
    const validImages = images.filter(function (i) { return i && i !== ''; });
    const variants = data.variants || [];
    const related = data.related || [];

    document.title = product.name + ' | Luôn Vui Tươi';

    var hasMultiImages = validImages.length > 1;
    var hasVariants = variants.length > 0;
    var basePrice = product.sale_price || product.price;
    var comparePrice = product.compare_price || product.price;
    var pct = comparePrice > basePrice ? Math.round((1 - basePrice / comparePrice) * 100) : 0;

    var optionNames = [];
    var optionValues = {};
    if (hasVariants) {
      variants.forEach(function (v) {
        if (v.option1_name && optionNames.indexOf(v.option1_name) === -1) optionNames.push(v.option1_name);
        if (v.option2_name && optionNames.indexOf(v.option2_name) === -1) optionNames.push(v.option2_name);
      });
      optionNames.forEach(function (name) {
        optionValues[name] = [];
        variants.forEach(function (v) {
          var val = v['option' + (optionNames.indexOf(name) + 1) + '_value'];
          if (val && optionValues[name].indexOf(val) === -1) optionValues[name].push(val);
        });
      });
    }

    var isImageOption = optionNames.length > 0 && optionNames[0] === 'Màu';

    var activeVariant = null;
    if (hasVariants && variants.length === 1) {
      activeVariant = variants[0];
    }

    var topSelling = product.meta_title || product.name;

    mainContent.innerHTML =
      '<div id="shopify-section-template--product__breadcrumb">' +
        '<nav class="m-breadcrumb m:w-full m-scroll-trigger animate--fade-in" role="navigation" aria-label="breadcrumbs">' +
          '<div class="container">' +
            '<div class="m-breadcrumb--wrapper m:flex m:items-center m:justify-center">' +
              '<a href="/" class="m-breadcrumb--item" title="Quay lại trang chủ">Trang chủ</a>' +
              '<span aria-hidden="true" class="m-breadcrumb--separator"><svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>' +
              '<span class="m-breadcrumb--item-current m-breadcrumb--item">' + escapeHtml(product.name) + '</span>' +
            '</div>' +
          '</div>' +
        '</nav>' +
      '</div>' +
      '<div id="shopify-section-template--product__main" class="shopify-section">' +
        '<div data-section-type="product-page" data-layout="layout-4" class="m-main-product m-gradient m-color-default">' +
          '<div class="container">' +
            '<div class="m-main-product--wrapper m:flex m:flex-wrap" style="--column-gap:50px;--column-gap-mobile:20px">' +
              '<div class="m-main-product--media m:column m:w-full md:m:w-1/2">' +
                '<media-gallery class="m-media-gallery m:w-full' + (hasMultiImages ? '' : ' m-media-gallery--single') + '" data-layout="layout-4">' +
                  '<div class="m-product-media--slider">' +
                    '<div class="m-product-media--slider__images">' +
                      '<div class="swiper-container">' +
                        '<div class="swiper-wrapper">' +
                          (validImages.length > 0 ? validImages.map(function (img, idx) {
                            var src = img.startsWith('http') ? img : '/' + img.replace(/^\/+/, '');
                            return '<div class="swiper-slide m-product-media--item media-type-image" data-index="' + idx + '">' +
                              '<div class="m-product-media m:blocks-radius" data-media-id="' + idx + '">' +
                                '<responsive-image class="m-image" style="--aspect-ratio:0.75">' +
                                  '<img src="' + src + '" alt="' + escapeHtml(product.name) + '" width="800" height="1067" fetchpriority="high" class="m:w-full m:h-full" sizes="(min-width:1200px) 588px, (min-width:990px) calc((100vw - 130px)/2), (min-width:750px) calc((100vw - 120px)/2), calc(100vw - 30px)">' +
                                '</responsive-image>' +
                              '</div>' +
                            '</div>';
                          }).join('') : '<div class="swiper-slide" style="background:#f5f5f5;aspect-ratio:0.75;display:flex;align-items:center;justify-content:center"><span style="color:#ccc">Không có ảnh</span></div>') +
                        '</div>' +
                      '</div>' +
                      (hasMultiImages ? '<div class="m-product-media--slider__thumbs"><div class="swiper-container"><div class="swiper-wrapper">' +
                        validImages.map(function (img, idx) {
                          var src = img.startsWith('http') ? img : '/' + img.replace(/^\/+/, '');
                          return '<div class="swiper-slide" data-index="' + idx + '"><img src="' + src + '" alt="" width="80" height="107"></div>';
                        }).join('') +
                      '</div></div></div>' : '') +
                    '</div>' +
                  '</div>' +
                '</media-gallery>' +
              '</div>' +
              '<div class="m-main-product--info m:column m:w-full md:m:w-1/2">' +
                '<div class="m-product-info--wrapper m:text-color-body">' +
                  '<div class="main-product__block main-product__block-title">' +
                    '<div class="product-block-group product-block-group--title">' +
                      '<h1 class="m-product-title">' + escapeHtml(product.name) + '</h1>' +
                    '</div>' +
                  '</div>' +
                  (product.sku ? '<div class="main-product__block main-product__block-meta"><ul class="m-product-meta"><li><span class="m-product-meta--label">Mã hàng:</span><span class="m-product-meta--value">' + escapeHtml(product.sku) + '</span></li></ul></div>' : '') +
                  '<div class="main-product__block main-product__block-price">' +
                    '<div class="product-block-group--price">' +
                      '<div class="m-price' + (pct > 0 ? ' m-price--on-sale' : '') + '" id="price-template">' +
                        (pct > 0 ?
                          '<div class="m-price__sale"><span class="m:visually-hidden">Giá bán</span><span class="m-price-item m-price-item--sale m-price-item--last" id="ProductPrice">' + formatPrice(basePrice) + '</span><s class="m-price-item m-price-item--compare" id="ComparePrice">' + formatPrice(comparePrice) + '</s></div>' :
                          '<div class="m-price__regular"><span class="m:visually-hidden">Giá cả phải chăng</span><span class="m-price-item m-price-item--regular" id="ProductPrice">' + formatPrice(basePrice) + '</span></div>'
                        ) +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  (hasVariants ? buildVariantPicker(variants, optionNames, optionValues, isImageOption) : '') +
                  buildBuyButtons(product, hasVariants) +
                  (product.description ? buildDescription(product.description) : '') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (related.length > 0 ? buildRelatedSection(related) : '');

    if (hasVariants) setupVariantSwitching(product, variants, optionNames);
    setupAddToCart(product, hasVariants);
  }

  function buildVariantPicker(variants, optionNames, optionValues, isImageOption) {
    var html = '<div class="main-product__block main-product__block-variant_picker"><variant-picker>';
    optionNames.forEach(function (name) {
      var values = optionValues[name];
      var typeClass = (isImageOption && name === 'Màu') ? 'm-product-option--image' : 'm-product-option--button';
      html += '<div class="m-product-option ' + typeClass + '">' +
        '<div class="m-product-option--label">' +
          '<label class="option-label"><span class="option-label--title">' + escapeHtml(name) + ':</span><span class="option-label--selected"></span></label>' +
        '</div>' +
        '<div class="m-product-option--content m:inline-flex m:flex-wrap" data-option-name="' + escapeHtml(name) + '">';
      values.forEach(function (val) {
        html += '<div class="m-product-option--node m-tooltip m-tooltip--top" data-value="' + escapeHtml(val) + '">' +
          '<input type="radio" name="option-' + escapeHtml(name) + '" value="' + escapeHtml(val) + '" id="option-' + escapeHtml(name) + '-' + escapeHtml(val) + '" class="m-product-option--input">' +
          '<label for="option-' + escapeHtml(name) + '-' + escapeHtml(val) + '" class="m-product-option--node__label">' + escapeHtml(val) + '</label>' +
        '</div>';
      });
      html += '</div></div>';
    });
    html += '</variant-picker></div>';
    return html;
  }

  function buildBuyButtons(product, hasVariants) {
    var disabled = hasVariants ? ' disabled' : '';
    return '<div class="main-product__block main-product__block-buy_buttons">' +
      '<product-form class="m-product-form m-product-form--main">' +
        '<form class="product-form-template--product__main" data-type="add-to-cart-form">' +
          (hasVariants ? '<input type="hidden" name="id" id="variant-id" value="">' : '<input type="hidden" name="id" value="' + (product.id || '') + '">') +
          '<div class="m-product-form--wrapper m:display-flex m:flex-wrap m:items-end">' +
            '<div class="m-product-form--input">' +
              '<label for="quantity">Số lượng</label>' +
              '<m-quantity-input class="m-quantity">' +
                '<button class="m-quantity__button" name="minus" type="button">-</button>' +
                '<input type="number" name="quantity" class="m-quantity__input" value="1" min="1" max="99" form="product-form-template--product__main" step="1">' +
                '<button class="m-quantity__button" name="plus" type="button">+</button>' +
              '</m-quantity-input>' +
            '</div>' +
            '<button type="submit" class="m-add-to-cart m-spinner-button m-button m-button--primary"' + disabled + '>Thêm vào giỏ hàng</button>' +
          '</div>' +
          '<div class="m-product-form-message" style="margin-top:10px;font-size:14px;color:#e74c3c;display:none"></div>' +
        '</form>' +
      '</product-form>' +
    '</div>';
  }

  function buildDescription(desc) {
    return '<div class="main-product__block main-product__block-description">' +
      '<div class="m-product-description rte">' +
        '<div class="m-product-description--content">' + desc + '</div>' +
      '</div>' +
    '</div>';
  }

  function buildRelatedSection(products) {
    var rows = products.map(function (p, i) {
      var price = p.sale_price || p.price;
      var compare = p.compare_price || p.price;
      var pct = compare > price ? Math.round((1 - price / compare) * 100) : 0;
      var imgs = p.images ? (Array.isArray(p.images) ? p.images : JSON.parse(p.images)) : [];
      var img = imgs[0] || '';
      var src = img.startsWith('http') ? img : (img ? '/' + img.replace(/^\/+/, '') : '');
      return '<div class="swiper-slide m:column">' +
        '<div class="m-product-card m-product-card--style-1' + (pct > 0 ? ' m-product-card--onsale' : '') + ' m-scroll-trigger animate--fade-in" data-view="card" data-product-id="' + p.id + '" data-cascade style="--animation-order:' + (i + 1) + '">' +
          '<div class="m-product-card__media">' +
            '<a class="m-product-card__link m:block m:w-full" href="/products/' + p.slug + '" aria-label="' + escapeHtml(p.name) + '">' +
              '<div class="m-product-card__main-image"><responsive-image class="m-image" style="--aspect-ratio:0.75"><img src="' + src + '" alt="' + escapeHtml(p.name) + '" width="400" height="533" loading="lazy" class="m:w-full m:h-full" sizes="(min-width:1200px) 267px, (min-width:990px) calc((100vw - 130px)/4), (min-width:750px) calc((100vw - 120px)/3), calc((100vw - 35px)/2)"></responsive-image></div>' +
            '</a>' +
            (pct > 0 ? '<div class="m-product-card__tags"><span class="m-product-card__tag-name m-product-tag m-product-tag--sale m-gradient m-color-badge-sale">-' + pct + '%</span></div>' : '') +
          '</div>' +
          '<div class="m-product-card__content m:text-left">' +
            '<div class="m-product-card__info">' +
              '<h3 class="m-product-card__title"><a href="/products/' + p.slug + '" class="m-product-card__name">' + escapeHtml(p.name) + '</a></h3>' +
              '<div class="m-product-card__price"><div class="m-price' + (pct > 0 ? ' m-price--on-sale' : '') + '" data-sale-badge-type="percentage">' +
                '<div class="m-price__regular"><span class="m-price-item m-price-item--regular">' + formatPrice(price) + '</span></div>' +
                (pct > 0 ? '<div class="m-price__sale"><span class="m-price-item m-price-item--sale m-price-item--last">' + formatPrice(price) + '</span><span class="m-price-item m-price-item--compare">' + formatPrice(compare) + '</span></div>' : '') +
              '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('\n');

    return '<div id="shopify-section-template--product__related" class="shopify-section">' +
      '<div class="m-section m-section--related-products m-gradient m-color-default" style="padding-top:50px;padding-bottom:50px">' +
        '<div class="container">' +
          '<div class="m-section__header m:text-left"><h2 class="m-section__heading h3 m-scroll-trigger animate--fade-in">Sản phẩm liên quan</h2></div>' +
          '<div class="m-section__content">' +
            '<div class="m-mixed-layout"><div class="m-mixed-layout__inner m:grid m:grid-cols-2 md:m:grid-cols-3 lg:m:grid-cols-4 m:gap-4">' + rows + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function setupVariantSwitching(product, variants, optionNames) {
    var inputs = document.querySelectorAll('.m-product-option--input');
    var variantIdInput = document.getElementById('variant-id');
    var priceEl = document.getElementById('ProductPrice');
    var compareEl = document.getElementById('ComparePrice');
    var addBtn = document.querySelector('.m-add-to-cart');
    var messageEl = document.querySelector('.m-product-form-message');

    function getSelectedOptions() {
      var selected = {};
      document.querySelectorAll('.m-product-option').forEach(function (optGroup) {
        var name = (optGroup.querySelector('[data-option-name]') || {}).dataset.optionName;
        var checked = optGroup.querySelector('.m-product-option--input:checked');
        if (name && checked) selected[name] = checked.value;
      });
      return selected;
    }

    function updateLabels() {
      document.querySelectorAll('.m-product-option--label').forEach(function (label) {
        var title = label.querySelector('.option-label--title');
        var selected = label.querySelector('.option-label--selected');
        if (!title || !selected) return;
        var optName = title.textContent.replace(':', '').trim();
        var sel = getSelectedOptions()[optName];
        selected.textContent = sel || 'Chọn';
      });
    }

    function findMatchingVariant(selected) {
      var keys = Object.keys(selected);
      if (keys.length === 0) return null;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        var optIdx = 1;
        keys.forEach(function (name) {
          var val = v['option' + optIdx + '_value'];
          if (val !== selected[name]) match = false;
          optIdx++;
        });
        if (match) return v;
      }
      return null;
    }

    function updateVariant() {
      var selected = getSelectedOptions();
      var variant = findMatchingVariant(selected);
      var allSelected = true;
      optionNames.forEach(function (name) {
        if (!selected[name]) allSelected = false;
      });

      if (variant && allSelected) {
        var price = variant.price || product.sale_price || product.price;
        var compare = product.compare_price || product.price;
        var pct = compare > price ? Math.round((1 - price / compare) * 100) : 0;

        variantIdInput.value = variant.id;
        if (priceEl) priceEl.textContent = formatPrice(price);
        if (compareEl) compareEl.textContent = formatPrice(compare);
        updatePriceDisplay(price, compare, pct);
        addBtn.disabled = false;
        if (messageEl) messageEl.style.display = 'none';
      } else {
        variantIdInput.value = '';
        if (!allSelected) {
          if (messageEl) { messageEl.textContent = 'Vui lòng chọn đầy đủ các tùy chọn'; messageEl.style.display = 'block'; }
        }
        addBtn.disabled = true;
      }
      updateLabels();
    }

    inputs.forEach(function (input) {
      input.addEventListener('change', updateVariant);
    });
    updateVariant();

    var buttons = document.querySelectorAll('.m-product-option--node');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.querySelector('.m-product-option--input');
        if (input) { input.checked = true; input.dispatchEvent(new Event('change')); }
      });
    });
  }

  function updatePriceDisplay(price, compare, pct) {
    var container = document.querySelector('.m-price');
    if (!container) return;
    var saleEl = container.querySelector('.m-price__sale');
    var regularEl = container.querySelector('.m-price__regular');
    if (pct > 0) {
      container.classList.add('m-price--on-sale');
      if (saleEl) {
        var salePriceEl = saleEl.querySelector('.m-price-item--sale');
        var comparePriceEl = saleEl.querySelector('.m-price-item--compare');
        if (salePriceEl) salePriceEl.textContent = formatPrice(price);
        if (comparePriceEl) comparePriceEl.textContent = formatPrice(compare);
      }
      if (regularEl) regularEl.style.display = 'none';
      if (saleEl) saleEl.style.display = '';
    } else {
      container.classList.remove('m-price--on-sale');
      if (regularEl) {
        var regularPriceEl = regularEl.querySelector('.m-price-item--regular');
        if (regularPriceEl) regularPriceEl.textContent = formatPrice(price);
      }
      if (regularEl) regularEl.style.display = '';
      if (saleEl) saleEl.style.display = 'none';
    }
  }

  function setupAddToCart(product, hasVariants) {
    var form = document.querySelector('.product-form-template--product__main');
    var addBtn = form ? form.querySelector('.m-add-to-cart') : null;
    var messageEl = document.querySelector('.m-product-form-message');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Đang thêm...'; }

      var variantIdEl = document.getElementById('variant-id');
      var quantityEl = form.querySelector('[name="quantity"]');
      var variantId = variantIdEl ? variantIdEl.value : (product.id || '');
      var quantity = quantityEl ? parseInt(quantityEl.value) || 1 : 1;

      try {
        var res = await fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: quantity })
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () { return { message: 'Lỗi khi thêm vào giỏ hàng' }; });
          throw new Error(errData.message || 'Lỗi khi thêm vào giỏ hàng');
        }

        if (messageEl) { messageEl.textContent = 'Đã thêm vào giỏ hàng!'; messageEl.style.color = '#27ae60'; messageEl.style.display = 'block'; }
        setTimeout(function () { if (messageEl) messageEl.style.display = 'none'; }, 3000);

        var cartBubble = document.querySelector('.m-cart-icon-bubble');
        if (cartBubble) {
          var count = cartBubble.querySelector('.m-cart-icon-bubble__count');
          if (count) count.textContent = parseInt(count.textContent || '0') + quantity;
        }
      } catch (e) {
        if (messageEl) { messageEl.textContent = e.message; messageEl.style.color = '#e74c3c'; messageEl.style.display = 'block'; }
      } finally {
        if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Thêm vào giỏ hàng'; }
      }
    });

    var minusBtn = form ? form.querySelector('[name="minus"]') : null;
    var plusBtn = form ? form.querySelector('[name="plus"]') : null;
    var qtyInput = form ? form.querySelector('.m-quantity__input') : null;

    if (minusBtn && qtyInput) {
      minusBtn.addEventListener('click', function () {
        var v = parseInt(qtyInput.value) || 1;
        if (v > 1) qtyInput.value = v - 1;
      });
    }
    if (plusBtn && qtyInput) {
      plusBtn.addEventListener('click', function () {
        var v = parseInt(qtyInput.value) || 1;
        if (v < 99) qtyInput.value = v + 1;
      });
    }
  }

  function formatPrice(price) {
    var num = parseInt(price) || 0;
    return num.toLocaleString('vi-VN') + '₫';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  loadProduct();
})();
