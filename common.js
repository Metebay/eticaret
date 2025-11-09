/**
 * Ortak JavaScript Mantığı: Firebase Bağlantısı, Sepet Fonksiyonları, Kimlik Doğrulama ve Ortak UI İşlemleri.
 * Tüm HTML sayfaları tarafından import edilir.
 */

// Firebase SDK'larını import et (Bu dosya "type=module" olarak diğer HTML'lerde çağrılacaktır)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
// Eksik olan fonksiyonları export ediyoruz: getDocs, query, where, Timestamp, onSnapshot.
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    collection,
    query, // <-- EKLENDİ
    getDocs, // <-- EKLENDİ
    Timestamp, // <-- EKLENDİ
    getDoc,
    where, // <-- EKLENDİ
    onSnapshot // <-- EKLENDİ
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// === 1. KURULUM VE GENEL DEĞİŞKENLER ===

// Firebase Yapılandırması
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

// Yeni export'lar: Firestore fonksiyonlarını dışarı aktarıyoruz
export { getDocs, query, where, onSnapshot, Timestamp }; // <-- BURADAN DİĞER SAYFALARA AÇILIYOR
export { doc, getDoc, setDoc, addDoc, deleteDoc, collection }; // Sadece kolaylık için eklendi


// YÖNETİCİ EMAİLİNİ BURADAN DEĞİŞTİRİN
const ADMIN_EMAIL = 'admin@e-ticaret.com';

let app, auth, db;
export let currentUser = null; // Aktif kullanıcıyı (auth + firestore verisi) tutar
export let isAuthReady = false; // Auth durumunun ilk kontrolü yapıldı mı?

// Firestore koleksiyon referansları
export let productsCollection, ordersCollection, usersCollection;

// Kategoriler listesi (Admin panelinde tutarlılık için)
export const CATEGORIES = [
    { value: 'all', label: 'Tüm Ürünler' },
    { value: 'forma', label: 'Formalar' },
    { value: 'ayakkabi', label: 'Ayakkabılar' },
    { value: 'aksesuar', label: 'Aksesuarlar' },
    { value: 'top', label: 'Toplar' }
];

// Firebase'i başlat
try {
    app = initializeApp(firebaseConfig);
    getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    productsCollection = collection(db, "products");
    ordersCollection = collection(db, "orders");
    usersCollection = collection(db, "users");

} catch (error) {
    console.error("Firebase başlatma hatası:", error);
    // UI'da hata göstermek için ortak bir mekanizma kullanılabilir.
}

// === 2. MODAL (BİLDİRİM) FONKSİYONLARI ===
// alert() veya confirm() yerine kullanılacak.
// Modal elementleri, her sayfada aynı ID'lerle tanımlanmalıdır.

export function showModal(title, message) {
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    if (modal && modalTitle && modalMessage) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
    } else {
        // Fallback: Eğer modal HTML'de yoksa konsola yaz
        console.warn(`Modal UI not found. Message: ${title} - ${message}`);
    }
}

export function closeModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
// HTML onclick event'leri için global scope'a ekleme
window.closeModal = closeModal;


// === 3. SEPET (localStorage) FONKSİYONLARI ===

export function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

export function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

export function addToCart(productId, product) {
    const cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += 1;
    } else {
        // paytrLink'i de sepete kaydet
        cart.push({ ...product, id: productId, quantity: 1 });
    }
    saveCart(cart);
    showModal("Sepete Eklendi", `${product.name} sepete eklendi!`);
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
}

export function updateCartQuantity(productId, quantity) {
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        } else {
            cart[existingProductIndex].quantity = quantity;
        }
        saveCart(cart);
    }
}

export function getCartTotalPrice() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const price = (item.price || 0) * (1 - (item.discount || 0) / 100);
        return total + (price * item.quantity);
    }, 0);
}

export function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const cart = getCart();
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        countEl.textContent = count;
    }
}

// === 4. HTML VE UI FONKSİYONLARI ===

/**
 * Sayfa yüklendiğinde navigasyonu ve kullanıcı durumunu günceller.
 * @param {string} currentPageId - Şu anki sayfanın ID'si (örneğin 'index', 'admin').
 */
export function updateNavAndAuthUI(currentPageId) {
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    const adminLink = document.getElementById('admin-link');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');

    // Navigasyon linklerini vurgula
    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('font-bold', 'text-emerald-600');
        if (a.getAttribute('href').includes(currentPageId)) {
             a.classList.add('font-bold', 'text-emerald-600');
        }
    });

    // Auth durumunu güncelle
    if (currentUser) {
        authLinks.classList.add('hidden');
        userLinks.classList.remove('hidden');
        userLinks.classList.add('flex');
        userEmailSpan.textContent = currentUser.email;

        // Admin linkini kontrol et (E-posta ile)
        const isAdmin = currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL;
        if (isAdmin) {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }

        if (logoutButton) {
            logoutButton.onclick = async () => {
                try {
                    await signOut(auth);
                    showModal("Başarılı", "Çıkış yapıldı.");
                    window.location.href = './index.html';
                } catch (error) {
                    console.error("Çıkış hatası:", error);
                    showModal("Hata", "Çıkış yapılamadı: " + error.message);
                }
            };
        }

    } else {
        authLinks.classList.remove('hidden');
        userLinks.classList.add('hidden');
        userLinks.classList.remove('flex');
    }
    
    // Sepet sayısını güncelle
    updateCartCount();
}

/**
 * Ürün kartı HTML'i oluşturur.
 * @param {object} product - Ürün verisi
 * @param {string} productId - Ürün Firestore ID'si
 * @returns {string} Ürün kartı HTML'i
 */
export function createProductCard(product, productId) {
    const price = (product.price || 0);
    const discount = (product.discount || 0);
    const discountedPrice = price * (1 - (discount / 100));

    return `
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
            <a href="./product.html?id=${productId}">
                <img src="${product.images[0] || 'https://placehold.co/400x300/e0f2f1/047857?text=CRSSPORA'}" 
                     alt="${product.name}" 
                     class="w-full h-56 object-cover transition-opacity duration-500"
                     onerror="this.src='https://placehold.co/400x300/e0f2f1/047857?text=CRSSPORA'">
            </a>
            <div class="p-5">
                <h3 class="text-xl font-bold text-gray-900 mb-1">${product.name}</h3>
                <p class="text-sm text-emerald-600 font-medium mb-3">${product.category}</p>
                <div class="flex items-center justify-between">
                    ${discount > 0 ? `
                        <div>
                            <span class="text-2xl font-extrabold text-red-600">${discountedPrice.toFixed(2)} TL</span>
                            <span class="text-sm text-gray-500 line-through ml-2">${price.toFixed(2)} TL</span>
                        </div>
                    ` : `
                        <span class="text-2xl font-extrabold text-emerald-600">${price.toFixed(2)} TL</span>
                    `}
                </div>
                <a href="./product.html?id=${productId}" class="block w-full text-center mt-4 bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 transition duration-150 shadow-md">
                    Detayları Gör
                </a>
            </div>
        </div>
    `;
}

// === 5. KİMLİK DOĞRULAMA ÇEKİRDEK İŞLEMLERİ (CORE AUTH) ===

/**
 * Kimlik doğrulama durumunun ilk kez yüklenmesini bekleyen Promise döner.
 * Bu, korumalı sayfaların (admin, checkout) doğru kullanıcı bilgisini almasını sağlar.
 * @returns {Promise<void>} Auth durumunun yüklendiği zaman çözülür.
 */
export function initAuthAndNav(currentPageId) {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Kullanıcı giriş yaptı
                const userDocRef = doc(usersCollection, user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    currentUser = { auth: user, ...userDoc.data() };
                } else {
                    // Firestore'da kaydı olmayan kullanıcı için varsayılan
                    currentUser = { auth: user, email: user.email, role: 'customer' };
                }
            } else {
                // Kullanıcı çıkış yaptı
                currentUser = null;
            }

            // Auth durumu hazır
            isAuthReady = true;
            updateNavAndAuthUI(currentPageId);
            unsubscribe(); // İlk yüklemeden sonra dinlemeyi bırak
            resolve();
        });
    });
}

/**
 * Yeni kullanıcı kaydı yapar.
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<boolean>} İşlem başarılıysa true
 */
export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Admin e-postası kontrolü
        const isAdmin = (email.toLowerCase() === ADMIN_EMAIL);

        await setDoc(doc(usersCollection, user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: isAdmin ? "admin" : "customer"
        });

        return true;
    } catch (error) {
        console.error("Kayıt hatası:", error);
        throw error;
    }
}

/**
 * Kullanıcı girişi yapar.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<boolean>} İşlem başarılıysa true
 */
export async function signInUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error) {
        console.error("Giriş hatası:", error);
        throw error;
    }
}


// === 6. FIREBASE VERİ İŞLEMLERİ ===

/**
 * Ürün ekler (Admin Paneli)
 * @param {object} productData - Ürün verisi (name, price, etc.)
 */
export async function addProduct(productData) {
    if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz İşlem: Ürün eklemek için admin olmalısınız.");
    }
    try {
        await addDoc(productsCollection, productData);
    } catch (error) {
        console.error("Ürün ekleme hatası:", error);
        throw error;
    }
}

/**
 * Ürün siler (Admin Paneli)
 * @param {string} productId - Silinecek ürün ID'si
 */
export async function deleteProduct(productId) {
    if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz İşlem: Ürün silmek için admin olmalısınız.");
    }
    try {
        await deleteDoc(doc(productsCollection, productId));
    } catch (error) {
        console.error("Ürün silme hatası:", error);
        throw error;
    }
}

/**
 * Sipariş oluşturur (Checkout)
 * @param {array} cart - Sepet içeriği
 * @param {number} totalPrice - Toplam fiyat
 */
export async function createOrder(cart, totalPrice) {
    if (!currentUser) {
        throw new Error("Sipariş oluşturmak için giriş yapmalısınız.");
    }
    try {
        const orderRef = await addDoc(ordersCollection, {
            userId: currentUser.auth.uid,
            items: cart,
            totalPrice: totalPrice,
            date: Timestamp.now(),
            status: "Beklemede"
        });
        return orderRef.id;
    } catch (error) {
        console.error("Sipariş oluşturma hatası:", error);
        throw error;
    }
}
