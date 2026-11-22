# NEXUS HUD

Yeni nesil otomotiv arayüzü: telefonu ön cama yansıtan **Windshield HUD** ve telefon ekranında
çalışan **Digital Cockpit**. Hız telefonun GPS'inden gerçek zamanlı ölçülür.

- 5 yapısal tema: NEXUS Original, Cyber Core, Quantum, Dark Matter, Hyperdrive
- Özel vektör rakam fontu, sistem başlatma ve GPS bağlantı animasyonları
- km/h – mph, gündüz/gece, ayna, parlaklık, ekran açık, hız uyarısı, gösterilecek bilgiler
- GPS verisi yoksa ya da doğruluk yetersizse hız yerine `--`; demo verisi açıkça etiketlenir

Tasarım kararı: [`docs/NEXUS_TASARIM.md`](docs/NEXUS_TASARIM.md)

```bash
npm install
npx expo start          # geliştirme
npx expo export --platform web   # web derlemesi (dist/)
npm test && npx tsc --noEmit && npx expo lint
```
