# NEXUS HUD — Tasarım Kararı

Bu belge, prototip geliştirilmeden önce yapılan konsept tartışmasını ve seçilen tasarım dilini özetler.
Tartışmaya iki bağımsız görüş katıldı: ana ekip ve dışarıdan gözden geçiren ikinci bir yapay zekâ ajanı
(otomotiv HMI / bilim kurgu arayüz tasarımcısı rolünde).

## 1. Konseptler

| | A — Orbital Lattice | B — Vector Blade | C — Monolith Prism |
|---|---|---|---|
| Fikir | Eş merkezli segmentli halkalar, dönen pusula çerçevesi, dört köşede veri kapsülü | Soldan sağa süpürülen yatay hız bıçağı, pahlı köşeler, yan veri rayı (uçak "tape" göstergeleri) | Altıgen prizma çerçeve, hızla yanan 60 ışık parçası, üstte savaş uçağı tipi yön şeridi, altta cam karolar |
| Savunan | Bilim kurgu arayüz tasarımcısı | Otomotiv HMI mühendisi | UX + görsel tasarım |

## 2. Puanlama (1–10)

| Ölçüt | A | B | C |
|---|---|---|---|
| Görsel özgünlük | 4 | 7 | 8 |
| Kullanılabilirlik | 6 | 7 | 7 |
| Okunabilirlik | 6 | 8 | 7 |
| Bilim kurgu hissi | 7 | 7 | 9 |
| Premium görünüm | 6 | 8 | 8 |
| Mobil performans | 4 | 9 | 6 |
| Cam yansıtma uygunluğu | 3 | 8 | 5 |

## 3. Eleştiriler

- **A** çok görülmüş bir "Iron Man halkası". Yüzlerce çizgi ve sürekli dönen çerçeve pil tüketir.
  Köşelerdeki veriler gözü merkezden uzaklaştırır. İnce çizgiler camdaki çift yansımada kaybolur.
  **Elendi.**
- **B** çevresel görüşte en iyi okunan konsept ve maliyeti en düşük. Bir sorunu var: sayı bıçağın
  üzerinde kayarsa göz sürekli yer değiştirir. Ayrıca soldan sağa akış ayna görüntüde ters döner.
  → Sayı sabit kalmalı, cam modunda dolum ortadan iki yana olmalı (simetrik).
- **C** en karakterli konsept. Ama 60 ayrı animasyonlu parça pil tüketir, altıgen de 3 haneli sayıyı
  sıkıştırır. Cam karolar (opaklık ve blur) camda görünmez.
- Ana ekibin kendi ilk fikrine eleştirisi: "Her temada aynı halka, farklı renk" yaklaşımı ilk taslakta
  vardı ve reddedildi. Temalar geometri, yerleşim ve tipografi bakımından ayrışmalı.

## 4. Seçilen konsept: "Prism Blade" (B + C hibriti)

- Sayı ortada ve sabit duruyor. Altında kavisli, 24 segmentlik prizma bıçak var; bıçak gittikçe
  kalınlaşıyor ve sona doğru renk turkuazdan mora geçiyor. Segmentler tek tek animasyonla değil,
  tek bir sürekli süpürme çizgisiyle UI thread'de yumuşatılıyor.
- Üstte C'deki yön şeridi, yanda B'deki veri rayı var.
- Cam modu ayrı bir dil kullanıyor: saf siyah zemin, kalın çizgiler, glow yok, mor yok, sürekli animasyon
  yok. Hız çubuğu ortadan iki yana doluyor, böylece ayna görüntüde de simetrik kalıyor.

## 5. Beş tema: yalnızca renk değil, yapı farkı

| Tema | Gösterge geometrisi | Veri yerleşimi | Rakam karakteri |
|---|---|---|---|
| NEXUS Original | Prizma bıçak + holografik üst köprü | Yan ray (yatay ekranda) / 2×2 panel | Prizma (pahlı) |
| Cyber Core | Hızla saat yönünde dolan sekizgen çekirdek + tarama çizgisi | Terminal ızgarası + daire pusula | Bölünmüş segment |
| Quantum | 270° yörünge yayı, üzerinde kayan parçacık, hızla hızlanan dönen yörünge | Simetrik iki sütun | İnce çizgi (hairline) |
| Dark Matter | Çerçeve yok; hızla kalınlaşan ufuk çizgisi, soluk gezegen halkası | Tek satır şerit | Mono |
| Hyperdrive | Ufka daralan warp şeritleri (hızla akar), eğik hız bandı | Üstte eğik HUD bandı + yön şeridi | Eğik (italic) |

## 6. Özel tipografi

Hazır font kullanılmadı. Rakamlar 10×16'lık bir ızgarada köşeleri pahlı vektör yollar olarak çizildi
(`src/components/nexus/NxNumber.tsx`). Sıfırın içinde çizgi var, böylece aynalandığında da 8'den ayrılıyor.
Tema varyantları aynı iskeletten üretiliyor: kalınlık, birleşim, segment boşluğu ve eğiklik değişiyor.

## 7. Dürüstlük ve güvenlik kuralları

- GPS konumu yoksa, sinyal 6 saniyeden uzun süre gelmezse ya da doğruluk 50 m'den kötüyse hız yerine
  `--` gösterilir. Son değer dondurulmaz.
- Maksimum hız iki ardışık ölçümle doğrulanır; tek bir sıçrama kaydı bozmaz.
- Sayı geçişi yalnızca iki gerçek ölçüm arasını yumuşatır, aradaki değerleri uydurmaz.
- Demo verisi varsayılan olarak kapalıdır. Açıldığında her ekranda "DEMO" uyarısı görünür.
- Sürüş sırasında (10 km/sa üstünde) ayarlar, tema ve sıfırlama kontrolleri kilitlenir.

## 8. Performans

- Animasyonlar Reanimated ile UI thread'de çalışır. Her göstergede en fazla 2–3 animasyonlu özellik var.
- Sürekli dönen ya da akan katmanlar "Animasyon: Az" seçeneğinde ve sistemde "hareketi azalt"
  açıksa kapanır.
- Uygulama arka plana geçince GPS aboneliği bırakılır. Pusula sensörü yalnızca pusula gösteriliyorsa
  ve GPS bağlıyken açılır, 4 Hz ile sınırlıdır.
- Hava durumu isteğe bağlıdır; 30 dakikada bir istenir.

## 9. Ekran görüntüleri

`docs/nexus-ekranlar/` klasöründe (web derlemesi, simüle GPS hareketi; demo modu kapalı).
