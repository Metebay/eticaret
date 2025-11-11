// --- PAFA TEAMSPORT E-TICARET COMMON.JS (Güncel ve Hata Giderilmiş Versiyon) ---

// === 1. FIREBASE SDK IMPORTS ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    deleteDoc, 
    collection, 
    query, 
    getDocs, 
    Timestamp,
    onSnapshot,
    where,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// === 2. FIREBASE KURULUMU ===
const firebaseConfig = {
    apiKey: "AIzaSyCcpgbcbHqMjkyxVmRllLj5ZV1yljMhsPk",
    authDomain: "whatsapp-415e2.firebaseapp.com",
    databaseURL: "https://whatsapp-415e2-default-rtdb.firebaseio.com",
    projectId: "whatsapp-415e2",
    storageBucket: "whatsapp-415e2.firebasestorage.app",
    messagingSenderId: "632645198033",
    appId: "1:632645198033:web:430cc6dc6671703f25a5f0",
    measurementId: "G-52SZ74C9F4"
};

// Global Firebase değişkenleri
let app, auth, db, analytics;
export let currentUser = null; 
export let isAuthReady = false; 
const ADMIN_EMAIL = "admin@e-ticaret.com"; 

// Koleksiyon referansları
export let productsCollection, ordersCollection, usersCollection;

// Stilleri ve Firebase'i başlat
try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    productsCollection = collection(db, "products");
    ordersCollection = collection(db, "orders");
    usersCollection = collection(db, "users");
    
    // CSS Değişkenlerini ve Stilleri Ekle
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        :root {
            --primary: #059669;
            --primary-dark: #047857;
            --primary-darker: #065f46;
            --accent: #f59e0b;
            --light: #f8fafc;
            --dark: #1e293b;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            scroll-behavior: smooth;
        }
        
        .gradient-bg { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, var(--primary-darker) 100%); }
        .category-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%); border: 1px solid #e2e8f0; }
        .category-card:hover { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: translateY(-10px); border-color: var(--primary); }
        .product-card { transition: all 0.3s ease; background: white; border-radius: 12px; overflow: hidden; }
        .product-card:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .floating-animation { animation: floating 6s ease-in-out infinite; }
        @keyframes floating { 0% { transform: translate(0, 0px) rotate(0deg); } 50% { transform: translate(0, -20px) rotate(2deg); } 100% { transform: translate(0, -0px) rotate(0deg); } }
        .pulse-animation { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .85; } }
        .bg-pattern { background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        .text-shadow { text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        .btn-primary { background: linear-gradient(to right, var(--primary), var(--primary-dark)); box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4); transition: all 0.3s ease; }
        .btn-primary:hover { background: linear-gradient(to right, var(--primary-dark), var(--primary-darker)); box-shadow: 0 10px 25px rgba(5, 150, 105, 0.5); transform: translateY(-2px); }
        .btn-secondary { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.3s ease; }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
        .sale-badge { position: absolute; top: 12px; right: 12px; background: linear-gradient(45deg, #ef4444, #f59e0b); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; z-index: 10; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .discount-badge { background: linear-gradient(45deg, #ef4444, #dc2626); }
        .new-badge { background: linear-gradient(45deg, var(--primary), #0ea5e9); }
        .trending-badge { background: linear-gradient(45deg, #f59e0b, #eab308); }
        .feature-card { transition: all 0.3s ease; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .feature-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }
        .testimonial-card { background: white; border-radius: 16px; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .testimonial-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }
        .brand-logo { filter: grayscale(100%); opacity: 0.6; transition: all 0.3s ease; }
        .brand-logo:hover { filter: grayscale(0%); opacity: 1; }
        .countdown-timer { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; }
        .timer-unit { background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px; min-width: 60px; }
        .newsletter-form { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); }
        .sticky-header { position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .mobile-menu { transform: translateX(-100%); transition: transform 0.3s ease; }
        .mobile-menu.open { transform: translateX(0); }
        .cart-badge { position: absolute; top: -8px; right: -8px; background: var(--accent); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
        .loading-spinner { border: 3px solid rgba(5, 150, 105, 0.3); border-radius: 50%; border-top: 3px solid var(--primary); width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .promo-banner { background: linear-gradient(90deg, var(--primary), var(--accent)); color: white; padding: 8px 0; overflow: hidden; }
        .flash-sale-badge { background: linear-gradient(45deg, #ef4444, #f59e0b); animation: pulse-flash 1.5s infinite; }
        @keyframes pulse-flash { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .discount-tag { background: linear-gradient(45deg, #ef4444, #dc2626); transform: rotate(-5deg); box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }
        .product-image-container { position: relative; overflow: hidden; }
        .product-image-container::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 70%, rgba(0,0,0,0.1) 100%); z-index: 1; }
        .price-slash { text-decoration: line-through; opacity: 0.7; }
        .logo-container img { width: 60px; height: 60px; object-fit: contain; }
        .mega-menu { opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s ease; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .mega-menu.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .mega-menu-column h4 { font-weight: 600; color: var(--primary); margin-bottom: 12px; font-size: 1.1rem; }
        .mega-menu-column ul li { margin-bottom: 8px; }
        .mega-menu-column ul li a { color: #4b5563; transition: color 0.2s ease; }
        .mega-menu-column ul li a:hover { color: var(--primary); }
        .countdown-digit { background: rgba(0, 0, 0, 0.8); border-radius: 8px; padding: 8px; min-width: 50px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .product-hover-info { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); transform: translateY(100%); transition: transform 0.3s ease; padding: 16px; box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.1); }
        .product-card:hover .product-hover-info { transform: translateY(0); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .gradient-text { background: linear-gradient(90deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .footer-logo { filter: brightness(0) invert(1); }

        /* Form Odaklanma Stilleri */
        input:focus, select:focus, textarea:focus {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.4) !important;
            outline: none;
        }
    `;
    document.head.appendChild(styleSheet);
    
    console.log("Firebase ve Stiller başarıyla başlatıldı.");
} catch (error) {
    console.error("Firebase başlatma hatası:", error);
    showModal("Kritik Hata", "Uygulama başlatılamadı. Lütfen daha sonra tekrar deneyin.");
}

// === 3. MODAL (BİLDİRİM) FONKSİYONLARI ===
export function showModal(title, message, type = 'success') {
    const modal = document.getElementById('message-modal');
    if (!modal) return;
    
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    modal.classList.remove('hidden');
}

export function closeModal() {
    const modal = document.getElementById('message-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeModal = closeModal;


// === 4. HEADER & FOOTER YÜKLEYİCİ (Hata Yönetimi Geliştirildi) ===
/**
 * Header ve Footer'ı HTML dosyalarına dinamik olarak yükler.
 */
export async function loadHeaderAndFooter(currentPageId) {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (!isAuthReady) {
        await initAuthAndNav();
    }

    try {
        // Header Yükleme
        if (headerPlaceholder) {
            const res = await fetch('_header.html');
            if (!res.ok) {
                throw new Error(`_header.html yüklenemedi. HTTP Durum: ${res.status} ${res.statusText}. Dosyanın kök dizinde var olduğunu kontrol edin.`);
            }
            headerPlaceholder.innerHTML = await res.text();
        }

        // Footer Yükleme
        if (footerPlaceholder) {
            const res = await fetch('_footer.html');
            if (!res.ok) {
                throw new Error(`_footer.html yüklenemedi. HTTP Durum: ${res.status} ${res.statusText}. Dosyanın kök dizinde var olduğunu kontrol edin.`);
            }
            footerPlaceholder.innerHTML = await res.text();
        }
        
        updateNavAndAuthUI(currentPageId);
        initHeaderFeatures();
        
    } catch (error) {
        console.error("Header/Footer yüklenirken KRİTİK HATA:", error);
        showModal("Yükleme Hatası", `Menü yüklenemedi. Detay: ${error.message}`, 'error');

        if (headerPlaceholder) headerPlaceholder.innerHTML = `<p class='text-red-500 text-center text-sm'>Menü yüklenemedi. Hata: ${error.message}</p>`;
        if (footerPlaceholder) footerPlaceholder.innerHTML = `<p class='text-red-500 text-center text-sm'>Alt bilgi yüklenemedi. Hata: ${error.message}</p>`;
    }
}


// (Diğer Auth, Cart ve Utility Fonksiyonları Kesilmeden Devam Edecek...)
// ...

// Fonksiyon: initAuthAndNav, updateNavAndAuthUI, initHeaderFeatures (Sayaçsız), registerUser, signInUser, logoutUser
// Fonksiyon: saveAddress, deleteAddress, loadAccountPage, renderAddressList
// Fonksiyon: getCart, saveCart, addToCart, removeFromCart, updateCartQuantity, getCartTotalPrice, updateCartCount
// Fonksiyon: createProductCard
// Fonksiyon: loadProductsPage, loadProductDetails
// Fonksiyon: loadCartPage, loadCheckoutPage, createOrder
// Fonksiyon: loadMyOrders, listenForOrders, handleUpdateStatus, handleSavePaymentLink, addProduct, deleteProduct
// ... (Burada kesilen fonksiyonların tamamının korunduğunu varsayıyoruz)

/**
 * Ana Sayfa (Öne Çıkan Ürünler) yükler.
 */
export async function $loadFeaturedProducts() {
    const featuredProductsList = document.getElementById('featured-products-list');
    if (!featuredProductsList) return;
    
    featuredProductsList.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Öne çıkan ürünler yükleniyor...</p></div>`;

    try {
        // Kurallarımız izin verdiği için (read: if true) bu sorgu çalışacaktır.
        const q = query(productsCollection); 
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredProductsList.innerHTML = '<div class="col-span-full text-center text-gray-600">Henüz öne çıkan ürün bulunmamaktadır.</div>';
            return;
        }

        let productsHtml = '';
        querySnapshot.docs.slice(0, 4).forEach(doc => { 
            productsHtml += createProductCard(doc.data(), doc.id);
        });
        featuredProductsList.innerHTML = productsHtml;

    } catch (error) {
        console.error("Öne çıkan ürünler yüklenirken hata:", error);
        featuredProductsList.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Ürünler yüklenirken bir sorun oluştu. Detay: Firestore Kuralı veya Bağlantı Hatası.</span></div>`;
    }
}

/**
 * Flaş İndirim Sayacını güncelleyen ve başlatan fonksiyon.
 */
export function $startCountdown(targetDate, daysEl, hoursEl, minutesEl, secondsEl) {
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            const countdownEl = daysEl.closest('#flash-sale-countdown');
            if (countdownEl) {
                 countdownEl.innerHTML = "<span class='text-lg font-bold'>Flaş İndirim Sona Erdi!</span>";
            }
            if(countdownInterval) clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = days.toString().padStart(2, '0');
        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
}

// Gerekli export'lar
export { 
    auth, db, 
    $loadFeaturedProducts, 
    $startCountdown, 
    getDocs, query, where, doc, getDoc, 
    updateDoc, deleteDoc, addDoc, setDoc, Timestamp,
    arrayUnion, arrayRemove
};
