
    (function() {
      var preconnectOrigins = ["https://cdn.shopify.com"];
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills-legacy.Ce1xoc0_.js","/cdn/shopifycloud/checkout-web/assets/c1/app-legacy.sGJDHFVT.js","/cdn/shopifycloud/checkout-web/assets/c1/esnext-vendor-legacy.DaJxL5H7.js","/cdn/shopifycloud/checkout-web/assets/c1/context-browser-legacy.Bs7DkcX8.js","/cdn/shopifycloud/checkout-web/assets/c1/shared-is-shop-pay-active-legacy.ezhXm9FM.js","/cdn/shopifycloud/checkout-web/assets/c1/Title-legacy.DBdSYeMs.js","/cdn/shopifycloud/checkout-web/assets/c1/images-payment-icon-legacy.5IgMAFKm.js","/cdn/shopifycloud/checkout-web/assets/c1/shared-unactionable-errors-legacy.OzqwWd7j.js","/cdn/shopifycloud/checkout-web/assets/c1/NotFound-legacy.BQoeptnX.js","/cdn/shopifycloud/checkout-web/assets/c1/types-UnauthenticatedErrorModalPayload-legacy.LhqnMJll.js","/cdn/shopifycloud/checkout-web/assets/c1/phone-phoneCountryCode-legacy.C369-a30.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayCheckoutGqlVersion-legacy.BkXCcf8U.js","/cdn/shopifycloud/checkout-web/assets/c1/utils-getCommonShopPayExternalTelemetryAttributes-legacy.BPfOTAEJ.js","/cdn/shopifycloud/checkout-web/assets/c1/graphql-ShopPayCheckoutSessionQuery-legacy.vt7EHwrt.js","/cdn/shopifycloud/checkout-web/assets/c1/graphql-UserPrivacySettingsSetMutation-legacy.CYEI1Lm5.js","/cdn/shopifycloud/checkout-web/assets/c1/hydrate-legacy.Bwh3ILTb.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-vi-legacy.DPfg96TA.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage-legacy.CHAFOv59.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useWalletsTimeout-legacy._wrGIgmd.js","/cdn/shopifycloud/checkout-web/assets/c1/remember-me-hooks-legacy.D9iO8lt-.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useStableHostMethodsReferences-legacy.CmxZBJOS.js","/cdn/shopifycloud/checkout-web/assets/c1/SplitDeliveryMerchandiseContainer-legacy.BZpIrHRJ.js","/cdn/shopifycloud/checkout-web/assets/c1/OffsitePaymentFailed-legacy.DVyWyBXF.js","/cdn/shopifycloud/checkout-web/assets/c1/ChangeCompanyLocationLink-legacy.BZRmTByx.js","/cdn/shopifycloud/checkout-web/assets/c1/WalletsSandbox-WalletSandbox-legacy.B7PvDKTw.js","/cdn/shopifycloud/checkout-web/assets/c1/BillingAddressForm-legacy.Cw_biu0v.js","/cdn/shopifycloud/checkout-web/assets/c1/PhoneField-legacy.D5aDoxaT.js","/cdn/shopifycloud/checkout-web/assets/c1/images-flag-icon-legacy.Bfupgm8k.js","/cdn/shopifycloud/checkout-web/assets/c1/AddressPresenter-legacy.Ctt7-4ZK.js","/cdn/shopifycloud/checkout-web/assets/c1/index-legacy.8zipj_Qx.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useCanChangeCompanyLocation-legacy.k7ACDJY5.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useForceShopPayUrl-legacy.BEl6EwqR.js","/cdn/shopifycloud/checkout-web/assets/c1/GooglePayButton-index-legacy.CB_IMSHI.js","/cdn/shopifycloud/checkout-web/assets/c1/MarketsProDisclaimer-legacy.BBWIwKWx.js","/cdn/shopifycloud/checkout-web/assets/c1/PendingShipping-legacy.DIy9FdMb.js","/cdn/shopifycloud/checkout-web/assets/c1/ImpressionEventCapture-legacy.B-3zRDM0.js","/cdn/shopifycloud/checkout-web/assets/c1/AutocompleteField-hooks-legacy.8uoeKjdo.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField-legacy.DWPFIdPe.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayPaymentRequiredMethod-legacy.BBn4-hkZ.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useUpdateCheckoutAddress-legacy.COD1td8j.js","/cdn/shopifycloud/checkout-web/assets/c1/billing-address-hooks-legacy.DIe3XM6l.js","/cdn/shopifycloud/checkout-web/assets/c1/WalletLogo-legacy.Ctbl6ft1.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useGeneralPaymentErrorMessage-legacy.CMSdEfnq.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShowShopPayOptin-legacy.Ch4JNKkM.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShowCreateMoreAccountsGdprTreatment-legacy.COlfEHe8.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentLine-legacy.DC4Er7xm.js","/cdn/shopifycloud/checkout-web/assets/c1/Section-legacy.C1mK-K94.js","/cdn/shopifycloud/checkout-web/assets/c1/MobileOrderSummary-legacy.FUu3Zj2s.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useOnePageFormSubmit-legacy.D99w5Aot.js","/cdn/shopifycloud/checkout-web/assets/c1/PayPalOverCaptureInfoBanner-legacy.DOK0BtNU.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-get-negotiation-input-legacy.Bnrdazse.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopCashCheckoutEligibility-legacy.JAzDiD8L.js","/cdn/shopifycloud/checkout-web/assets/c1/redemption-constants-legacy.CxiN0GmP.js","/cdn/shopifycloud/checkout-web/assets/c1/BillingAddressSelector-legacy.BKvdjRkI.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentErrorBanner-legacy.5jewKMmu.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblems-StockProblemsLineItemList-legacy.tA0N-61B.js","/cdn/shopifycloud/checkout-web/assets/c1/DutyOptions-legacy.41eVwA5x.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown-legacy.Csxea0ix.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal-legacy.BMCeDLJk.js","/cdn/shopifycloud/checkout-web/assets/c1/extension-targets-shipping-options-legacy.XxAaH2Km.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview-legacy.B3md_zc-.js","/cdn/shopifycloud/checkout-web/assets/c1/EstimatedDeliveryContent-legacy.BRzd1n0x.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodSelector-legacy.DbqpqyMs.js","/cdn/shopifycloud/checkout-web/assets/c1/SubscriptionPriceBreakdown-legacy.CHNBKVqV.js","/cdn/shopifycloud/checkout-web/assets/c1/DeliveryMethodLineFact-legacy.B0zuAj6j.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingGroupsSummaryLine-legacy.P_AWS0ud.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-publishMessage-legacy.BoG2owBb.js"];
      var styles = [];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0918/5597/8816/files/Luon_Vuituoi_Bold_200_x320.png?v=1740371784"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = preconnectOrigins.concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  