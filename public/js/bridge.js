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

  var pfProto = window.customElements && customElements.get('product-form');
  if (pfProto && pfProto.prototype) {
    var origHandler = pfProto.prototype.onSubmitHandler;
    if (origHandler) {
      pfProto.prototype.onSubmitHandler = function(evt) {
        evt.preventDefault();
        this.toggleSpinner && this.toggleSpinner(true);
        var formData = new FormData(this.form);
        var body = JSON.stringify({
          id: formData.get('id'),
          quantity: parseInt(formData.get('quantity')) || 1
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
    var form = e.target;
    if (form.action && form.action.indexOf('/account/login') > -1) {
      var email = form.querySelector('[name="customer[email]"], [name="email"]');
      var pass = form.querySelector('[name="customer[password]"], [name="password"]');
      if (email && pass) {
        e.preventDefault();
        origFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, password: pass.value })
        }).then(function(r) {
          if (r.ok) { window.location = '/account'; }
          else { return r.json().then(function(d) { alert(d.message || 'Đăng nhập thất bại'); }); }
        }).catch(function() { alert('Lỗi kết nối'); });
      }
    }
    if (form.action && form.action.indexOf('/account/register') > -1) {
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
    }
  });
})();
