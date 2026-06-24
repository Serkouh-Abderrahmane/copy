(function() {
  if (window.__bridgeLoaded) return;
  window.__bridgeLoaded = true;

  var s = window.MinimogSettings = window.MinimogSettings || {};
  s.routes = s.routes || {};
  s.routes.cart_add_url = '/cart/add';
  s.routes.cart_change_url = '/cart/change';
  s.routes.cart_clear_url = '/cart/clear';
  s.routes.cart_update_url = '/cart/update';
  s.routes.search_url = '/search?type=product&q=';
  s.routes.cart = '/cart';
  s.use_ajax_atc = true;
  s.enable_cart_drawer = true;

  var shop = window.Shopify = window.Shopify || {};
  shop.routes = shop.routes || {};
  shop.routes.root = '/';
  shop.shop = 'luonvuituoi.co';

  var ms = window.MinimogStrings = window.MinimogStrings || {};
  ms.itemAdded = 'Đã thêm vào giỏ hàng';
  ms.selectVariant = 'Vui lòng chọn phân loại hàng';

  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string') {
      if (url.indexOf('/cart/add') > -1 || url === '/cart/add') {
        return handleCartAdd(url, opts);
      }
      if (url.indexOf('/cart/change') > -1 || url.indexOf('/cart/update') > -1) {
        opts = opts || {};
        opts.headers = opts.headers || {};
        opts.headers['Content-Type'] = 'application/json';
        if (opts.body && opts.body instanceof FormData) {
          var obj = {};
          opts.body.forEach(function(v, k) { obj[k] = v; });
          opts.body = JSON.stringify(obj);
        }
      }
      if (url.match(/\/cart\.json$/)) {
        url = '/cart.json';
      }
    }
    return origFetch.call(this, url, opts);
  };

  function handleCartAdd(url, opts) {
    opts = opts || {};
    var bodyData = {};
    if (opts.body instanceof FormData) {
      opts.body.forEach(function(v, k) { bodyData[k] = v; });
    } else if (typeof opts.body === 'object') {
      try { bodyData = JSON.parse(opts.body); } catch(e) { bodyData = opts.body; }
    }
    var jsonBody = JSON.stringify({
      id: bodyData.id,
      quantity: parseInt(bodyData.quantity) || 1,
      properties: bodyData.properties || {}
    });
    var newOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonBody,
      credentials: opts.credentials || 'same-origin'
    };
    return origFetch(url, newOpts);
  }

  window.createSearchLink = function(query) {
    return '/search?type=product&q=' + encodeURIComponent(query);
  };

  function overrideProductFormSubmit() {
    var pfProto = window.customElements && customElements.get('product-form');
    if (!pfProto || !pfProto.prototype || !pfProto.prototype.onSubmitHandler) return;
    pfProto.prototype.onSubmitHandler = function(evt) {
      evt.preventDefault();
      this.toggleSpinner && this.toggleSpinner(true);
      var formData = new FormData(this.form);
      var body = JSON.stringify({
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity')) || 1,
        product_handle: this.form.dataset.productHandle || ''
      });
      var self = this;
      origFetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        credentials: 'same-origin'
      }).then(function(r) { return r.json(); }).then(function(response) {
        if (response.status) {
          var msg = response.description || response.message || 'Lỗi';
          window.MinimogEvents && MinimogEvents.emit('cart-error', {
            source: 'product-form',
            productVariantId: formData.get('id'),
            errors: msg,
            message: msg
          });
          document.dispatchEvent(new CustomEvent('product-ajax:error', { detail: { errorMessage: msg } }));
          if (!formData.get('id')) {
            self.handleErrorMessageVariantPicker && self.handleErrorMessageVariantPicker();
            showNoti(self.domNodes.errorWrapper || document.body, 'error', ms.selectVariant);
          } else {
            showNoti(self.domNodes.errorWrapper || document.body, 'error', msg);
          }
          self.toggleSpinner && self.toggleSpinner(false);
          return;
        }
        if (self.cart && self.cart.renderContents) {
          self.cart.renderContents(response);
          showNoti(self.cart.querySelector('m-cart-drawer-items'), 'success', ms.itemAdded, 400);
          window.MinimogEvents && MinimogEvents.emit('open-cart-drawer');
        } else {
          showNoti(self.domNodes.errorWrapper || document.body, 'success', ms.itemAdded);
          updateCartCountUI(response.item_count);
        }
        document.dispatchEvent(new CustomEvent('product-ajax:added', { detail: { product: response } }));
        window.MinimogEvents && MinimogEvents.emit('cart-update', response);
        self.error = false;
        self.toggleSpinner && self.toggleSpinner(false);
      }).catch(function(e) {
        console.error(e);
        self.toggleSpinner && self.toggleSpinner(false);
      });
    };
  }
  if (window.customElements) {
    if (customElements.get('product-form')) {
      overrideProductFormSubmit();
    } else {
      customElements.whenDefined('product-form').then(function() {
        overrideProductFormSubmit();
      }).catch(function() {
        document.addEventListener('DOMContentLoaded', function() {
          overrideProductFormSubmit();
        });
      });
    }
  }

  function showNoti(target, type, message, delay) {
    try {
      window.MinimogTheme && MinimogTheme.Notification && MinimogTheme.Notification.show({
        target: target || document.body,
        method: 'appendChild',
        type: type,
        message: message,
        delay: delay || 3000
      });
    } catch(e) {}
  }

  function updateCartCountUI(count) {
    document.querySelectorAll('.m-cart-count-bubble').forEach(function(el) {
      if (count > 0) {
        el.textContent = count;
        el.classList.remove('m:hidden');
      } else {
        el.classList.add('m:hidden');
      }
    });
  }

  document.addEventListener('submit', function(e) {
    var target = e.target;
    if (!target || !target.action) return;
    var action = (target.action || '').toLowerCase();
    if (action.indexOf('/cart/add') > -1 && !target.closest('.btn--buy-now')) {
      e.preventDefault();
      e.stopPropagation();
      var idInput = target.querySelector('[name="id"]');
      var qtyInput = target.querySelector('[name="quantity"]');
      var id = idInput ? idInput.value : '';
      var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      var pf = target.closest('product-form');
      if (!id) {
        if (pf) {
          pf.handleErrorMessageVariantPicker && pf.handleErrorMessageVariantPicker();
          pf.classList.remove('m-spinner-loading');
        }
        showNoti(document.body, 'error', ms.selectVariant, 3000);
        return;
      }
      if (pf) pf.classList.add('m-spinner-loading');
      origFetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          quantity: qty,
          product_handle: (target.dataset.productHandle || (pf && pf.form && pf.form.dataset.productHandle) || ''),
          properties: {}
        }),
        credentials: 'same-origin'
      }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.description || d.message || 'Lỗi'); });
        return r.json();
      }).then(function(response) {
        if (pf) pf.classList.remove('m-spinner-loading');
        showNoti(document.body, 'success', ms.itemAdded, 400);
        var count = response.item_count;
        document.querySelectorAll('.m-cart-count-bubble').forEach(function(el) {
          if (count > 0) { el.textContent = count; el.classList.remove('m:hidden'); }
          else { el.classList.add('m:hidden'); }
        });
        var drawer = document.querySelector('m-cart-drawer');
        if (drawer && drawer.classList) {
          drawer.classList.add('m-cart-drawer--active');
          requestAnimationFrame(function() {
            drawer.style.setProperty('--m-bg-opacity', '0.5');
            var inner = drawer.querySelector('.m-cart-drawer__inner');
            if (inner) inner.style.setProperty('--translate-x', '0');
          });
          document.documentElement.classList.add('prevent-scroll');
        }
      }).catch(function(err) {
        if (pf) pf.classList.remove('m-spinner-loading');
        showNoti(document.body, 'error', err.message || 'Lỗi khi thêm vào giỏ hàng', 3000);
      });
      return;
    }

    var form = e.target;
    var action = (form.action || '').toLowerCase();

    if (action.indexOf('/account/recover') > -1) {
      var email = form.querySelector('[name="customer[email]"], [name="email"]');
      if (email) {
        e.preventDefault();
        origFetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value })
        }).then(function(r) { return r.json(); }).then(function(d) {
          alert(d.message || 'Vui lòng kiểm tra email');
        }).catch(function() { alert('Lỗi kết nối'); });
      }
      return;
    }

    if (action.indexOf('/account/login') > -1) {
      var email = form.querySelector('[name="customer[email]"], [name="email"]');
      var pass = form.querySelector('[name="customer[password]"], [name="password"]');
      if (email && pass) {
        e.preventDefault();
        origFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, password: pass.value })
        }).then(function(r) {
          if (r.ok) {
            var params = new URLSearchParams(window.location.search);
            var redirect = params.get('redirect') || '/account';
            window.location = redirect;
          }
          else { return r.json().then(function(d) { alert(d.message || 'Đăng nhập thất bại'); }); }
        }).catch(function() { alert('Lỗi kết nối'); });
      }
      return;
    }

    if (action.indexOf('/account/register') > -1 || action.indexOf('/account') > -1) {
      var email = form.querySelector('[name="customer[email]"], [name="email"]');
      var pass = form.querySelector('[name="customer[password]"], [name="password"]');
      var firstName = form.querySelector('[name="customer[first_name]"], [name="first_name"]');
      if (email && pass) {
        e.preventDefault();
        origFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.value,
            password: pass.value,
            first_name: firstName ? firstName.value : ''
          })
        }).then(function(r) {
          if (r.ok) { window.location = '/account'; }
          else { return r.json().then(function(d) { alert(d.message || 'Đăng ký thất bại'); }); }
        }).catch(function() { alert('Lỗi kết nối'); });
      }
      return;
    }

    if (action.indexOf('/contact') > -1 && action.indexOf('/contact#contact_form') > -1) {
      e.preventDefault();
      var name = (form.querySelector('[name="contact[name]"]') || {}).value || '';
      var email = (form.querySelector('[name="contact[email]"]') || {}).value || '';
      var phone = (form.querySelector('[name="contact[phone]"]') || {}).value || '';
      var body = (form.querySelector('[name="contact[body]"]') || {}).value || '';
      origFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, phone: phone, body: body })
      }).then(function(r) { return r.json(); }).then(function(d) {
        alert('Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.');
      }).catch(function() {});
      return;
    }

    if (action.indexOf('/contact') > -1 && action.indexOf('subscribe') > -1) {
      e.preventDefault();
      var email = (form.querySelector('[name="contact[email]"]') || {}).value || '';
      origFetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      }).then(function(r) { return r.json(); }).then(function(d) {
        alert('Đăng ký nhận tin thành công!');
      }).catch(function() {});
      return;
    }

    if (action.indexOf('/cart/add') > -1) {
      return;
    }
    if (action.indexOf('/cart') > -1) {
      if (e.submitter && e.submitter.name === 'checkout') {
        e.preventDefault();
        window.location = '/checkout';
        return;
      }
    }
  });
  function addBuyNowButton() {
    var form = document.querySelector('product-form form[action*="/cart/add"]');
    if (!form) return;
    var addBtn = form.querySelector('[type="submit"][name="add"]');
    if (!addBtn) return;
    if (form.querySelector('.btn--buy-now')) return;

    var buyNow = document.createElement('button');
    buyNow.type = 'button';
    buyNow.className = addBtn.className + ' btn--buy-now';
    buyNow.textContent = 'Mua Ngay';
    addBtn.parentNode.insertBefore(buyNow, addBtn.nextSibling);

    buyNow.addEventListener('click', function(e) {
      e.preventDefault();
      var idInput = form.querySelector('[name="id"]');
      var qtyInput = form.querySelector('[name="quantity"]');
      var id = idInput ? idInput.value : '';
      var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      if (!id) {
        showNoti(document.body, 'error', ms.selectVariant, 3000);
        return;
      }
      buyNow.disabled = true;
      buyNow.textContent = 'Đang xử lý...';
      origFetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          quantity: qty,
          product_handle: form.dataset.productHandle || ''
        }),
        credentials: 'same-origin'
      }).then(function(r) {
        if (!r.ok) return r.json().then(function(d) {
          throw new Error(d.description || d.message || 'Lỗi khi thêm vào giỏ hàng');
        });
        return r.json();
      }).then(function() {
        return origFetch('/api/auth/me', { credentials: 'same-origin' });
      }).then(function(r) {
        if (r.ok) {
          window.location = '/checkout';
        } else {
          window.location = '/account/login?redirect=/checkout';
        }
      }).catch(function(err) {
        alert(err.message);
        buyNow.disabled = false;
        buyNow.textContent = 'Mua Ngay';
      });
    });
  }

  function addQuickAddButtons() {
    var cards = document.querySelectorAll('.m-product-card');
    if (!cards.length) return;
    cards.forEach(function(card) {
      var actionEl = card.querySelector('.m-product-card__action');
      if (!actionEl) return;
      if (actionEl.querySelector('button, a')) return;

      var link = card.querySelector('.m-product-card__name');
      if (!link) return;
      var href = link.getAttribute('href') || '';

      var variantId = null;
      var foxkit = card.querySelector('foxkit-preorder-badge script[type="application/json"]');
      if (foxkit) {
        try {
          var variants = JSON.parse(foxkit.textContent);
          if (variants && variants.length) {
            var found = null;
            for (var i = 0; i < variants.length; i++) {
              if (variants[i].available) { found = variants[i]; break; }
            }
            if (!found) found = variants[0];
            variantId = found && found.id;
          }
        } catch(e) {}
      }

      if (!variantId) {
        var couponBox = card.querySelector('.elsklip-coupon-box');
        if (couponBox) {
          try {
            var klipData = JSON.parse(couponBox.getAttribute('data-klip-product') || '{}');
            var keys = Object.keys(klipData);
            if (keys.length) {
              var variants = klipData[keys[0]].variants;
              if (variants && variants.length) {
                var found = null;
                for (var i = 0; i < variants.length; i++) {
                  if (variants[i].available !== false) { found = variants[i]; break; }
                }
                if (!found) found = variants[0];
                variantId = found && found.id;
              }
            }
          } catch(e) {}
        }
      }

      if (variantId) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm-add-to-cart m-button m-button--primary';
        btn.textContent = 'Thêm vào giỏ hàng';
        (function(id) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this;
            self.disabled = true;
            self.textContent = 'Đang thêm...';
            origFetch('/cart/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, quantity: 1 }),
              credentials: 'same-origin'
            }).then(function(r) {
              if (!r.ok) return r.json().then(function(d) { throw new Error(d.description || 'Lỗi'); });
              return r.json();
            }).then(function(response) {
              self.textContent = 'Đã thêm ✓';
              setTimeout(function() {
                self.textContent = 'Thêm vào giỏ hàng';
                self.disabled = false;
              }, 1500);
              showNoti(document.body, 'success', ms.itemAdded, 400);
              updateCartCountUI(response.item_count);
            }).catch(function(err) {
              self.textContent = 'Thêm vào giỏ hàng';
              self.disabled = false;
              showNoti(document.body, 'error', err.message || 'Lỗi', 3000);
            });
          });
        })(variantId);
        actionEl.appendChild(btn);
      } else {
        var viewBtn = document.createElement('a');
        viewBtn.href = href;
        viewBtn.className = 'm-add-to-cart m-button m-button--primary';
        viewBtn.textContent = 'Xem chi tiết';
        actionEl.appendChild(viewBtn);
      }
    });
  }

  function loadCartPage() {
    if (document.documentElement.getAttribute('data-template') !== 'cart') return;
    origFetch('/cart.json', { credentials: 'same-origin' }).then(function(r) { return r.json(); }).then(function(cart) {
      var container = document.querySelector('.m-cart--empty, .m-cart__empty, [data-section-type="cart-template"], .m-cart__wrapper');
      if (!container) container = document.querySelector('.main-content, .container, main, [role="main"]');
      if (!container) return;
      var wrapper = container.closest('.m-cart') || container;
      if (cart.item_count > 0) {
        var html = '<div class="m-cart__wrapper"><form action="/cart" method="post"><table class="m-cart__table"><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Số lượng</th><th>Tạm tính</th></tr></thead><tbody>';
        cart.items.forEach(function(item) {
          var price = (item.final_price || item.price || 0) / 100;
          var lineTotal = (item.final_line_price || item.line_price || 0) / 100;
          var img = item.featured_image && item.featured_image.url;
          html += '<tr class="m-cart__item" data-item-id="' + item.id + '">';
          html += '<td class="m-cart__item-info">';
          if (img) html += '<img src="' + img + '" alt="' + (item.product_title || item.title) + '" width="80" style="float:left;margin-right:12px">';
          html += '<a href="' + (item.url || '#') + '">' + (item.product_title || item.title) + '</a>';
          html += '</td>';
          html += '<td class="m-cart__item-price">' + price.toLocaleString('vi-VN') + '₫</td>';
          html += '<td class="m-cart__item-qty"><input type="number" value="' + item.quantity + '" min="0" class="cart-qty-input" data-key="' + item.id + '" style="width:60px;padding:4px;text-align:center"></td>';
          html += '<td class="m-cart__item-total">' + lineTotal.toLocaleString('vi-VN') + '₫</td>';
          html += '<td><button class="cart-remove-btn" data-key="' + item.id + '" style="background:none;border:none;cursor:pointer;font-size:18px">&times;</button></td>';
          html += '</tr>';
        });
        var total = (cart.total_price || cart.original_total_price || 0) / 100;
        html += '</tbody></table>';
        html += '<div style="text-align:right;margin-top:20px;font-size:20px;font-weight:bold">Tổng cộng: ' + total.toLocaleString('vi-VN') + '₫</div>';
        html += '<div style="text-align:right;margin-top:15px"><a href="/checkout" class="m-button m-button--primary" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:4px">Thanh toán</a></div>';
        html += '</form></div>';
        wrapper.innerHTML = html;
        wrapper.querySelectorAll('.cart-qty-input').forEach(function(input) {
          input.addEventListener('change', function() {
            var itemId = this.dataset.key;
            var qty = parseInt(this.value) || 0;
            origFetch('/cart/change', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: itemId, quantity: qty }),
              credentials: 'same-origin'
            }).then(function() { loadCartPage(); }).catch(function() { loadCartPage(); });
          });
        });
        wrapper.querySelectorAll('.cart-remove-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var itemId = this.dataset.key;
            origFetch('/cart/change', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: itemId, quantity: 0 }),
              credentials: 'same-origin'
            }).then(function() { loadCartPage(); }).catch(function() { loadCartPage(); });
          });
        });
      } else {
        wrapper.innerHTML = '<div class="m-cart__empty" style="text-align:center;padding:60px 20px"><h2>Giỏ hàng trống</h2><p style="color:#666;margin:10px 0">Hãy thêm sản phẩm vào giỏ hàng</p><a href="/" class="m-button m-button--primary" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:4px;margin-top:10px">Mua sắm ngay</a></div>';
      }
    }).catch(function() {});
  }

  function onReady() {
    addBuyNowButton();
    addQuickAddButtons();
    loadCartPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
