document.querySelectorAll("[data-photo], [data-scene]").forEach((slot) => {
    const image = new Image();
    const { photo, scene, alt } = slot.dataset;
    let usingScene = !photo;
    image.alt = alt;
    image.decoding = "async";
    image.addEventListener("load", () => {
        slot.append(image);
        slot.classList.add("has-photo");
        slot.classList.toggle("has-scene", usingScene);
    }, { once: true });
    if (photo && scene) {
        image.addEventListener("error", () => {
            usingScene = true;
            image.src = scene;
        }, { once: true });
    }
    image.src = photo || scene;
});

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-revealed");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18 });

    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
}

const pageProgress = document.querySelector(".page-progress");
const routeNav = document.querySelector(".route-nav");
const routeStops = [...routeNav.querySelectorAll("a")].map((link) => ({
    link,
    section: document.querySelector(link.hash),
}));
let activeStop = routeStops[0];

function updatePageProgress() {
    const page = document.documentElement;
    const scrollableHeight = page.scrollHeight - page.clientHeight;
    const fraction = scrollableHeight > 0 ? page.scrollTop / scrollableHeight : 0;
    pageProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, fraction))})`;

    const marker = parseFloat(getComputedStyle(page).scrollPaddingTop) + 2;
    const atBottom = scrollableHeight > 0 && page.scrollTop >= scrollableHeight - 1;
    const stop = atBottom
        ? routeStops.at(-1)
        : routeStops.findLast(({ section }) => section.getBoundingClientRect().top <= marker) ?? routeStops[0];
    if (stop !== activeStop) {
        activeStop.link.removeAttribute("aria-current");
        stop.link.setAttribute("aria-current", "location");
        const routeProgress = routeStops.indexOf(stop) / (routeStops.length - 1);
        routeNav.style.setProperty("--route-progress", routeProgress);
        activeStop = stop;
    }
}

window.addEventListener("scroll", updatePageProgress, { passive: true });
window.addEventListener("resize", updatePageProgress);
updatePageProgress();

const checklist = [...document.querySelectorAll('.checklist input[type="checkbox"]')];
const progress = document.querySelector("#packing-progress");
const footerProgress = document.querySelector("#footer-packing-progress");
const packingFilter = document.querySelector("#packing-filter");
const packingDone = document.querySelector("#packing-done");
const storageKey = "alishan-packing-v1";

function updateProgress() {
    const packed = checklist.filter((item) => item.checked).map((item) => item.name);
    progress.textContent = `已備妥 ${packed.length} / ${checklist.length}`;
    footerProgress.textContent = progress.textContent;
    const onlyUnpacked = packingFilter.getAttribute("aria-pressed") === "true";
    checklist.forEach((item) => {
        item.closest("label").hidden = onlyUnpacked && item.checked;
    });
    packingDone.hidden = !onlyUnpacked || packed.length !== checklist.length;
    return packed;
}

try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
        checklist.forEach((item) => {
            item.checked = saved.includes(item.name);
        });
    }
} catch {
    // The checklist still works when the browser blocks local storage.
}

updateProgress();
packingFilter.hidden = false;
packingFilter.addEventListener("click", () => {
    const onlyUnpacked = packingFilter.getAttribute("aria-pressed") === "true";
    packingFilter.setAttribute("aria-pressed", String(!onlyUnpacked));
    updateProgress();
    updatePageProgress();
});
checklist.forEach((item) => {
    item.addEventListener("change", () => {
        const hadFocus = document.activeElement === item;
        const packed = updateProgress();
        if (hadFocus && item.closest("label").hidden) {
            const next = checklist.find((input) => !input.checked) ?? packingFilter;
            next.focus({ preventScroll: true });
        }
        updatePageProgress();
        try {
            localStorage.setItem(storageKey, JSON.stringify(packed));
        } catch {
            // The visible progress is already updated.
        }
    });
});
