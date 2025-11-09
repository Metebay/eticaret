// === E-Ticaret Sitesi Ortak JS Dosyası ===
// Bu dosya, 7 HTML dosyasının tamamı tarafından paylaşılan
// tüm çekdek fonksiyonları içerir.

// --- Firebase SDK'larını import et ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
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
    where // <-- KATEGORİ SORGUSU İÇİN EKLENDİ
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// === 1. KURULUM VE GENEL DEĞİŞKENLER ===

// Your web app's Firebase configuration
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

// --- Firebase Servislerini Başlat ve Export Et ---
// Bu değişkenler, diğer HTML dosyalarındaki script'ler tarafından import edilecek.
export let app, auth, db, analytics;
export let productsCollection, ordersCollection, usersCollection;

try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    productsCollection = collection(db, "products");
    ordersCollection = collection(db, "orders");
    usersCollection = collection(db, "users");
    
    console.log("Firebase başarıyla başlatıldı.");
} catch (error) {
    console.error("Firebase başlatma hatası:", error);
    showModal("Hata", "Uygulama başlatılamadı.");
}

// --- Global Değişkenler ---
export let currentUser = null;
// Admin email adresini hier belirleyin
export const ADMIN_EMAIL = 'admin@e-ticaret.com'; // <-- YÖNETİCİ EMAİLİNİ BURADAN DEĞİŞTİRİN


// === 2. MODAL (BİLDİRİM) FONKSİYONLARI ===
const modal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');

export function showModal(title, message) {
    if (modalTitle && modalMessage && modal) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'block';
    } else {
        // Fallback (eğer modal HTML'de yoksa)
        console.warn("Modal bulunamadı:", title, message);
    }
}

export function closeModal() {
    if (modal) {
        modal.style.display = 'none';
    }
}
// Modal'ı HTML'den (onclick) erişilebilir yap
window.closeModal = closeModal;


// === 3. SEPET (localStorage) FONKSİYONLARI ===

export function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

export function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

export function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
    }
}

export function getCartTotalPrice() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const price = (item.price || 0) * (1 - (item.discount || 0) / 100);
        return total + (price * item.quantity);
    }, 0);
}

export function addToCart(productId, product) {
    const cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += 1;
    } else {
        cart.push({ ...product, id: productId, quantity: 1 });
    }
    saveCart(cart);
    showModal("Başarılı", `${product.name} sepete eklendi!`);
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    
    // Eğer sepet sayfasındaysak, sayfayı anında güncelle
    if (window.location.pathname.includes('cart.html')) {
        // 'loadCartPage' fonksiyonu cart.html'deki script'te olmalı
        // ve global window objesine eklenmiş olmalı.
        if (window.loadCartPage) {
            window.loadCartPage();
        }
    }
}
// HTML (onclick) üzerinden erişim için global yap
window.removeFromCart = removeFromCart;

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
        
        // Eğer sepet veya checkout sayfasındaysak, sayfayı anında güncelle
        if (window.location.pathname.includes('cart.html')) {
            if (window.loadCartPage) {
                window.loadCartPage();
            }
        }
        if (window.location.pathname.includes('checkout.html')) {
             if (window.loadCheckoutPage) {
                window.loadCheckoutPage();
            }
        }
    }
}
// HTML (onchange) üzerinden erişim için global yap
window.updateCartQuantity = updateCartQuantity;


// === 4. KİMLİK DOĞRULAMA (AUTH) İŞLEMLERİ ===

// Bu fonksiyon, her sayfa yüklendiğinde (DOMContentLoaded) çağrılmalı.
// Navigasyon çubuğunu ve kullanıcı durumunu yönetir.
export function initAuthAndNav() {
    
    onAuthStateChanged(auth, async (user) => {
        const authLinks = document.getElementById('auth-links');
        const userLinks = document.getElementById('user-links');
        const adminLink = document.getElementById('admin-link');
        const userEmailSpan = document.getElementById('user-email');

        if (user) {
            const userDocRef = doc(usersCollection, user.uid);
            const userDoc = await getDoc(userDocRef);

            let userData = { email: user.email };
            if (userDoc.exists()) {
                userData = { ...userData, ...userDoc.data() };
            }

            const userRole = (user.email === ADMIN_EMAIL) ? 'admin' : 'customer';
            currentUser = { auth: user, ...userData, role: userRole };
            
            if(authLinks) authLinks.style.display = 'none';
            if(userLinks) userLinks.style.display = 'flex';
            if(userEmailSpan) userEmailSpan.textContent = currentUser.email;

            if (adminLink) {
                if (currentUser.role === 'admin') {
                    adminLink.style.display = 'block';
                } else {
                    adminLink.style.display = 'none';
                }
            }
            
            // Giriş yapmış kullanıcıyı login/register sayfalarında tutma
            if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
                window.location.href = 'index.html';
            }

        } else {
            currentUser = null;
            if(authLinks) authLinks.style.display = 'flex';
            if(userLinks) userLinks.style.display = 'none';
            if(adminLink) adminLink.style.display = 'none';
            if(userEmailSpan) userEmailSpan.textContent = '';
            
            // Giriş yapılmamışsa, korumalı sayfalardan (admin, checkout) yönlendir
            if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('checkout.html')) {
                 window.location.href = 'login.html';
            }
        }
    });

    // Çıkış Butonu
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showModal("Başarılı", "Çıkış yapıldı.");
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Çıkış hatası:", error);
                showModal("Hata", "Çıkış yapılamadı: " + error.message);
            }
        });
    }
}

// === 5. SAYFAYA ÖZEL İŞLEVLER (Firebase importlarını da buraya taşıyabiliriz) ===
// Bu fonksiyonlar, ihtiyaç duyan HTML dosyaları tarafından import edilecek.

// --- index.html ---
// Kategori filtrelemesi için fonksiyon imzası güncellendi (category = null)
export async function loadIndexPage(productListDiv, category = null) {
    if (!productListDiv) return;
    productListDiv.innerHTML = '<div class="text-center p-4 col-span-full text-gray-500">Ürünler yükleniyor...</div>';
    
    try {
        // Kategoriye göre sorgu oluşturma
        let q;
        if (category) {
            // Belirli bir kategori seçildiyse filtrele
            // !! ÖNEMLİ !! Bu sorgunun çalışması için Firestore'da 'products' koleksiyonu üzerinde
            // 'category' alanı için bir DİZİN (INDEX) oluşturulması gerekir.
            q = query(productsCollection, where("category", "==", category));
        } else {
            // Kategori seçilmediyse (veya 'Tümü' seçildiyse) tüm ürünleri getir
            q = query(productsCollection);
        }

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            if (category) {
                productListDiv.innerHTML = `<div class="text-center p-4 col-span-full text-gray-500">'${category}' kategorisinde ürün bulunamadı.</div>`;
            } else {
                productListDiv.innerHTML = '<div class="text-center p-4 col-span-full text-gray-500">Gösterilecek ürün bulunamadı.</div>';
            }
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const price = (product.price || 0);
            const discount = (product.discount || 0);
            const discountedPrice = price * (1 - discount / 100);

            html += `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden group transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <a href="product.html?id=${productId}">
                        <img src="${product.images[0] || 'https://placehold.co/400x300/eee/ccc?text=Gorsel+Yok'}" 
                             alt="${product.name}" 
                             class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                             onerror="this.src='https://placehold.co/400x300/eee/ccc?text=Gorsel+Hata'">
                    </a>
                    <div class="p-5">
                        <p class="text-sm text-gray-500 mb-1">${product.category}</p>
                        <h3 class="text-lg font-semibold text-gray-900 truncate" title="${product.name}">${product.name}</h3>
                        <div class="mt-3 mb-4">
                            ${discount > 0 ? `
                                <div>
                                    <span class="text-2xl font-bold text-emerald-600">${discountedPrice.toFixed(2)} TL</span>
                                    <span class="text-sm text-gray-500 line-through ml-2">${price.toFixed(2)} TL</span>
                                </div>
                            ` : `
                                <span class="text-2xl font-bold text-emerald-600">${price.toFixed(2)} TL</span>
                            `}
                        </div>
                        <a href="product.html?id=${productId}" class="block w-full text-center bg-emerald-50 text-emerald-600 font-medium py-2 rounded-md hover:bg-emerald-100 transition-colors duration-200">
                            Detayları Gör
                        </a>
                    </div>
                </div>
            `;
        });
        productListDiv.innerHTML = html;
        
    } catch (error) {
        console.error("Ürünler yüklenirken hata:", error);
        // Önceki 'failed-precondition' kontrolü kaldırıldı, çünkü bu basit sorgu için
        // otomatik tek alanlı dizin yeterlidir ve bu hata beklenmez.
        productListDiv.innerHTML = '<div class="text-center p-4 col-span-full text-red-500">Ürünler yüklenemedi. ' + error.message + '</div>';
    }
}

// --- product.html ---
export async function loadProductPage(id, contentDiv) {
    if (!id) {
        window.location.href = 'index.html';
        return;
    }
    if (!contentDiv) return;

    contentDiv.innerHTML = '<div class="text-center p-10 text-gray-500">Ürün yükleniyor...</div>';
    
    try {
        const docRef = doc(productsCollection, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            contentDiv.innerHTML = '<div class="text-center p-10 text-red-500">Ürün bulunamadı.</div>';
            return;
        }

        const product = docSnap.data();
        const productId = docSnap.id;
        const price = (product.price || 0);
        const discount = (product.discount || 0);
        const discountedPrice = price * (1 - discount / 100);

        let imagesHtml = '';
        if (product.images && product.images.length > 0) {
            imagesHtml += `<img id="main-product-image" src="${product.images[0]}" alt="${product.name}" class="w-full h-auto max-h-[500px] object-contain rounded-lg mb-4 bg-gray-100" onerror="this.src='https://placehold.co/600x400/eee/ccc?text=Gorsel+Hata'">`;
            
            if (product.images.length > 1) {
                imagesHtml += '<div class="flex space-x-2 overflow-x-auto p-2">';
                product.images.forEach(imgUrl => {
                    imagesHtml += `
                        <img src="${imgUrl}" 
                             alt="thumbnail" 
                             class="w-20 h-20 object-cover rounded-md cursor-pointer border-2 border-gray-200 transition-all hover:border-emerald-500"
                             onclick="document.getElementById('main-product-image').src='${imgUrl}'">
                    `;
                });
                imagesHtml += '</div>';
            }
        } else {
            imagesHtml = `<img src="https://placehold.co/600x400/eee/ccc?text=Gorsel+Yok" alt="${product.name}" class="w-full h-96 object-contain rounded-lg mb-4 bg-gray-100">`;
        }

        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                    ${imagesHtml}
                </div>
                <div class="flex flex-col justify-center">
                    <span class="text-sm text-gray-500 uppercase tracking-wider">${product.category}</span>
                    <h1 class="text-4xl font-extrabold text-gray-900 my-3">${product.name}</h1>
                    <p class="text-gray-700 mb-6 leading-relaxed">${product.description}</p>
                    
                    <div class="mb-6">
                        ${discount > 0 ? `
                            <div class="flex items-baseline space-x-3">
                                <span class="text-4xl font-bold text-emerald-600">${discountedPrice.toFixed(2)} TL</span>
                                <span class="text-2xl text-gray-400 line-through">${price.toFixed(2)} TL</span>
                                <span class="bg-red-100 text-red-600 text-sm font-medium px-2 py-1 rounded-full">%${discount} İndirim</span>
                            </div>
                        ` : `
                            <span class="text-4xl font-bold text-emerald-600">${price.toFixed(2)} TL</span>
                        `}
                    </div>
                    
                    <button id="add-to-cart-button" class="w-full bg-emerald-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-emerald-300">
                        Sepete Ekle
                    </button>
                </div>
            </div>
        `;
        contentDiv.innerHTML = html;
        
        document.getElementById('add-to-cart-button').addEventListener('click', () => {
            const finalProduct = {
                ...product,
                price: price, 
                discount: discount,
                paytrLink: product.paytrLink || ""
            };
            addToCart(productId, finalProduct);
        });

    } catch (error) {
        console.error("Ürün detayı yüklenirken hata:", error);
        contentDiv.innerHTML = '<div class="text-center p-10 text-red-500">Ürün yüklenemedi.</div>';
    }
}

// --- login.html ---
export function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            try {
                errorEl.textContent = '';
                await signInWithEmailAndPassword(auth, email, password);
                showModal("Başarılı", "Giriş yapıldı. Ana sayfaya yönlendiriliyorsunuz.");
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Giriş hatası:", error);
                errorEl.textContent = "Giriş başarısız oldu: " + error.message;
            }
        });
    }
}

// --- register.html ---
export function initRegisterPage() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorEl = document.getElementById('register-error');

            try {
                errorEl.textContent = '';
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await setDoc(doc(usersCollection, user.uid), {
                    uid: user.uid,
                    name: name,
                    email: email,
                    role: "customer"
                });

                showModal("Başarılı", "Kayıt işlemi tamamlandı. Ana sayfaya yönlendiriliyorsunuz.");
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Kayıt hatası:", error);
                errorEl.textContent = "Kayıt başarısız oldu: " + error.message;
            }
        });
    }
}

// --- cart.html ---
export function loadCartPage() {
    const cart = getCart();
    const itemsDiv = document.getElementById('cart-items');
    const cartEmptyDiv = document.getElementById('cart-empty');
    const cartFullDiv = document.getElementById('cart-full');
    const totalSpan = document.getElementById('cart-total-price');
    
    if (!itemsDiv || !cartEmptyDiv || !cartFullDiv || !totalSpan) return;

    if (cart.length === 0) {
        itemsDiv.innerHTML = '';
        cartEmptyDiv.style.display = 'block';
        cartFullDiv.style.display = 'none';
        return;
    }

    cartEmptyDiv.style.display = 'none';
    cartFullDiv.style.display = 'block';
    
    let html = '';
    cart.forEach(item => {
        const price = (item.price || 0);
        const discount = (item.discount || 0);
        const discountedPrice = price * (1 - discount / 100);
        const itemTotal = discountedPrice * item.quantity;
        
        html += `
            <div class="flex items-center justify-between py-5">
                <div class="flex items-center space-x-4">
                    <img src="${item.images[0] || 'https://placehold.co/100x100'}" alt="${item.name}" class="w-20 h-20 object-cover rounded-lg shadow-sm">
                    <div>
                        <a href="product.html?id=${item.id}" class="text-lg font-semibold text-gray-800 hover:text-emerald-600">${item.name}</a>
                        <p class="text-sm text-gray-500">${discountedPrice.toFixed(2)} TL ${discount > 0 ? `(%${discount} indirim)` : ''}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <input type="number" value="${item.quantity}" min="1" class="w-16 text-center border rounded-md focus:ring-1 focus:ring-emerald-500" 
                           onchange="window.updateCartQuantity('${item.id}', this.valueAsNumber)">
                    <span class="font-semibold w-24 text-right text-gray-800">${itemTotal.toFixed(2)} TL</span>
                    <button class="text-red-500 hover:text-red-700 transition-colors" onclick="window.removeFromCart('${item.id}')" title="Ürünü Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    itemsDiv.innerHTML = html;
    totalSpan.textContent = `${getCartTotalPrice().toFixed(2)} TL`;
}

// --- checkout.html ---
export function loadCheckoutPage() {
    if (!currentUser) {
        showModal("Uyarı", "Sipariş vermek için lütfen giriş yapın.");
        window.location.href = 'login.html';
        return;
    }
    
    const cart = getCart();
    const itemsDiv = document.getElementById('checkout-items');
    const totalSpan = document.getElementById('checkout-total-price');
    const confirmButton = document.getElementById('confirm-order-button');
    const warningDiv = document.getElementById('checkout-warning');
    const messageEl = document.getElementById('checkout-message');

    if (!itemsDiv || !totalSpan || !confirmButton || !warningDiv || !messageEl) return;
    
    messageEl.textContent = '';
    
    if (cart.length > 1) {
        itemsDiv.innerHTML = '<p class="text-red-500">Sepetinizde birden fazla ürün var.</p>';
        warningDiv.textContent = 'PayTR Linkle Ödeme, tek seferde sadece 1 ürün tipi için geçerlidir. Lütfen sepetinizde tek bir ürün bırakın.';
        warningDiv.style.display = 'block';
        confirmButton.disabled = true;
        confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
        totalSpan.textContent = `${getCartTotalPrice().toFixed(2)} TL`;
        return;
    } 
    else if (cart.length === 0) {
        itemsDiv.innerHTML = '<p class="text-gray-500">Sepetinizde ürün bulunmuyor.</p>';
        totalSpan.textContent = '0.00 TL';
        warningDiv.style.display = 'none';
        confirmButton.disabled = true;
        confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }
    
    warningDiv.style.display = 'none';
    confirmButton.disabled = false;
    confirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
    
    let html = '';
    cart.forEach(item => {
        const price = (item.price || 0);
        const discount = (item.discount || 0);
        const discountedPrice = price * (1 - discount / 100);
        const itemTotal = discountedPrice * item.quantity;
        
        html += `
            <div class="flex justify-between py-2">
                <span>${item.name} (x${item.quantity})</span>
                <span>${itemTotal.toFixed(2)} TL</span>
            </div>
        `;
    });
    
    itemsDiv.innerHTML = html;
    totalSpan.textContent = `${getCartTotalPrice().toFixed(2)} TL`;
}

export function initCheckoutConfirm() {
    const confirmButton = document.getElementById('confirm-order-button');
    if (!confirmButton) return;

    confirmButton.addEventListener('click', async () => {
        if (!currentUser) {
            showModal("Hata", "Sipariş oluşturmak için giriş yapmalısınız.");
            return;
        }
        
        const cart = getCart();
        if (cart.length !== 1) {
            showModal("Hata", "Sepetinizde 1 ürün olmalıdır.");
            return;
        }

        const item = cart[0];
        const paytrLink = item.paytrLink;

        if (!paytrLink) {
             showModal("Hata", "Bu ürün için bir ödeme linki tanımlanmamış.");
             return;
        }
        
        const totalPrice = getCartTotalPrice();
        const messageEl = document.getElementById('checkout-message');

        try {
            await addDoc(ordersCollection, {
                userId: currentUser.auth.uid,
                items: cart, 
                totalPrice: totalPrice,
                date: Timestamp.now(), 
                status: "Ödeme Bekliyor"
            });

            localStorage.removeItem('cart'); 
            updateCartCount();
            
            messageEl.textContent = 'Siparişiniz alındı. Ödeme sayfasına yönlendiriliyorsunuz...';
            showModal("Başarılı", "Siparişiniz alındı. Ödeme sayfasına yönlendiriliyorsunuz...");

            setTimeout(() => {
                window.location.href = paytrLink;
            }, 2000);

        } catch (error) {
            console.error("Sipariş oluşturma hatası:", error);
            messageEl.textContent = 'Sipariş oluşturulurken bir hata oluştu: ' + error.message;
            showModal("Hata", "Sipariş oluşturulurken bir hata oluştu: " + error.message);
        }
    });
}

// --- admin.html ---
export function loadAdminPage() {
    const adminContent = document.getElementById('admin-content');
    const unauthorizedDiv = document.getElementById('admin-unauthorized');
    
    if (!adminContent || !unauthorizedDiv) return;

    if (!currentUser || currentUser.role !== 'admin') {
        adminContent.style.display = 'none';
        unauthorizedDiv.style.display = 'block';
         if (currentUser && currentUser.role !== 'admin') {
            showModal("Yetki Hata", "Bu sayfaya erişim yetkiniz yok.");
            window.location.href = './index.html';
         }
         if (!currentUser) {
             window.location.href = './login.html';
         }
        return;
    }

    adminContent.style.display = 'grid'; // 'block' yerine 'grid'
    unauthorizedDiv.style.display = 'none';
    
    loadAdminProducts();
    loadAdminOrders();
}

export function initAdminForm() {
    const adminForm = document.getElementById('admin-add-product-form');
    if (!adminForm) return;

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser || currentUser.role !== 'admin') {
            showModal("Hata", "Yetkisiz işlem.");
            return;
        }

        const name = document.getElementById('admin-product-name').value;
        const price = parseFloat(document.getElementById('admin-product-price').value);
        const description = document.getElementById('admin-product-description').value;
        const category = document.getElementById('admin-product-category').value;
        const discount = parseInt(document.getElementById('admin-product-discount').value, 10);
        const imageLinks = document.getElementById('admin-product-images').value;
        const paytrLink = document.getElementById('admin-product-paytr-link').value;
        
        const images = imageLinks.split(',').map(link => link.trim()).filter(link => link.length > 0);
        const messageEl = document.getElementById('admin-product-message');

        try {
            await addDoc(productsCollection, {
                name, price, description, category, discount, images,
                paytrLink: paytrLink || ""
            });
            
            messageEl.textContent = "Ürün başarıyla eklendi!";
            messageEl.classList.remove('text-red-600');
            messageEl.classList.add('text-green-600');
            adminForm.reset();
            
        } catch (error) {
            console.error("Ürün ekleme hatası:", error);
            messageEl.textContent = "Ürün eklenemedi: " + error.message;
            messageEl.classList.remove('text-green-600');
            messageEl.classList.add('text-red-600');
        }
    });
}

function loadAdminProducts() {
    const productListDiv = document.getElementById('admin-product-list');
    if (!productListDiv) return;

    const q = query(productsCollection);
    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            productListDiv.innerHTML = '<p class="text-gray-500">Henüz ürün eklenmemiş.</p>';
            return;
        }
        
        let html = '';
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            html += `
                <div class="flex items-center justify-between py-3 transition-colors hover:bg-gray-50 px-2 rounded-md">
                    <div class="flex items-center space-x-3">
                        <img src="${product.images[0] || 'https://placehold.co/50x50'}" alt="${product.name}" class="w-12 h-12 object-cover rounded-md shadow-sm">
                        <div>
                            <p class="font-medium text-gray-800">${product.name}</p>
                            <p class="text-sm text-gray-500">${product.price.toFixed(2)} TL - %${product.discount} indirim</p>
                        </div>
                    </div>
                    <button class="text-white bg-red-500 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-600 transition-colors" onclick="window.deleteProduct('${productId}')">
                        Sil
                    </button>
                </div>
            `;
        });
        productListDiv.innerHTML = html;
        
    }, (error) => {
        console.error("Admin ürünleri dinleme hatası:", error);
        productListDiv.innerHTML = '<p class="text-red-500">Ürünler yüklenemedi.</p>';
    });
}

window.deleteProduct = async (id) => {
    if (!currentUser || currentUser.role !== 'admin') {
        showModal("Hata", "Yetkisiz işlem.");
        return;
    }
    
    // Gerçek bir uygulamada burada "Emin misiniz?" modalı gösterilmeli.
    // Şimdilik direkt siliyoruz.
    try {
        await deleteDoc(doc(productsCollection, id));
        showModal("Başarılı", "Ürün silindi.");
    } catch (error) {
        console.error("Ürün silme hatası:", error);
        showModal("Hata", "Ürün silinemedi: " + error.message);
    }
}

function loadAdminOrders() {
    const orderListDiv = document.getElementById('admin-order-list');
    if (!orderListDiv) return;

    const q = query(ordersCollection);
    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            orderListDiv.innerHTML = '<p class="text-gray-500">Henüz sipariş yok.</p>';
            return;
        }
        
        let html = '';
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const orderId = doc.id;
            
            let itemsHtml = order.items.map(item => `
                <li class="text-gray-600">${item.name} (x${item.quantity})</li>
            `).join('');

            html += `
                <div class="border p-4 rounded-lg bg-white shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold text-gray-800">Sipariş ID: <span class="font-mono text-emerald-600">${orderId.substring(0, 8)}...</span></span>
                        <span class="text-sm text-gray-500">${order.date.toDate().toLocaleString('tr-TR')}</span>
                    </div>
                    <p class="text-sm text-gray-500">Kullanıcı ID: ${order.userId}</p>
                    <p class="font-medium mt-2">Durum: <span class="text-emerald-600 font-semibold">${order.status}</span></p>
                    <p class="font-bold text-lg text-gray-900 mt-2">Toplam: ${order.totalPrice.toFixed(2)} TL</p>
                    <ul class="list-disc list-inside mt-2 text-sm">
                        ${itemsHtml}
                    </ul>
                </div>
            `;
        });
        orderListDiv.innerHTML = html;
        
    }, (error) => {
        console.error("Admin siparişleri dinleme hatası:", error);
        orderListDiv.innerHTML = '<p class="text-red-500">Siparişler yüklenemedi.</p>';
    });
}
