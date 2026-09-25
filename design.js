/* Shared accessible navigation and reference-matched outline icon set. */
(function () {
  function icon(name) {
    return (
      '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#' +
      name +
      '"></use></svg>'
    );
  }
  var replacements = {
    "📞": "phone",
    "💬": "chat",
    "📷": "camera",
    "🛒": "cart",
    "📍": "pin",
    "🗺️": "map",
    "🔔": "calendar",
    "🛡️": "shield",
    "🧴": "bottle",
    "🕐": "clock",
    "🛵": "truck",
  };
  document
    .querySelectorAll(".i,.pill-ico,.br-pin,.fb-loc>span,.promo-ico")
    .forEach(function (el) {
      var name = replacements[el.textContent.trim()];
      if (name) el.innerHTML = icon(name);
    });
  var nav = document.querySelector(".mainnav"),
    actions = document.querySelector(".header-right");
  if (nav && actions) {
    nav.id = "site-navigation";
    nav.setAttribute("aria-label", "التنقل الرئيسي");
    nav
      .querySelector(".wrap")
      .insertAdjacentHTML(
        "beforeend",
        '<a class="nav-extra" href="/delivery-areas">مناطق التوصيل</a><a class="nav-extra" href="/suppliers">الموردون</a>',
      );
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "menu-toggle";
    toggle.setAttribute("aria-label", "عرض قائمة التنقل");
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = icon("menu");
    actions.prepend(toggle);
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("expanded");
      toggle.setAttribute("aria-expanded", String(open));
      if (open) nav.querySelector(".nav-extra").focus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("expanded")) {
        nav.classList.remove("expanded");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
    nav.querySelectorAll("a.active").forEach(function (a) {
      a.setAttribute("aria-current", "page");
    });
  }
  var main = document.querySelector("main");
  if (main) {
    main.id = "main-content";
    var skip = document.createElement("a");
    skip.href = "#main-content";
    skip.className = "skip-link";
    skip.textContent = "تخطَّ إلى المحتوى";
    document.body.prepend(skip);
  }
  function openRequest() {
    var form = document.getElementById("request-form");
    if (form && location.hash === "#request-form") {
      form.open = true;
      form.scrollIntoView({ block: "start" });
    }
  }
  window.addEventListener("hashchange", openRequest);
  openRequest();
  document.querySelectorAll('a[href="#request-form"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var form = document.getElementById("request-form");
      if (form) form.open = true;
    });
  });
  // Honor Tally's dynamic embed height only for the known form and origin.
  window.addEventListener("message", function (event) {
    if (event.origin !== "https://tally.so") return;
    var frame = document.querySelector(".registration-form iframe");
    if (!frame || event.source !== frame.contentWindow) return;
    var data = event.data;
    try {
      if (typeof data === "string") data = JSON.parse(data);
    } catch (_) {
      return;
    }
    if (
      data &&
      data.event === "Tally.FormLoaded" &&
      data.payload &&
      Number.isFinite(data.payload.height)
    )
      frame.style.height =
        Math.max(400, Math.min(3000, data.payload.height)) + "px";
  });
  // Footer and mobile bar are inserted by app.js at DOMContentLoaded.
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".qbar .i,.fb-loc>span").forEach(function (el) {
      var name = replacements[el.textContent.trim()];
      if (name) el.innerHTML = icon(name);
    });
  });
})();
