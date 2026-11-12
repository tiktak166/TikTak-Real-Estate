# TikTak Real Estate — Frontend

## Gutangiza
1. Tangiza backend uri muri `backend/`: `npm.cmd run dev`.
2. Fungura terminal ya kabiri, winjire muri `frontend/`, utangize static server:
   `npx.cmd --yes http-server . -p 5501 -c-1`
3. Fungura `http://127.0.0.1:5501/index.html`.
4. Admin yinjira kuri `account.html#login` akoresheje konti ya ADMIN; nyuma yo kwinjira ahita ajya kuri `admin.html`.

## Ibyo frontend ihuza na API
- Homepage: amatangazo yemejwe, gushakisha, Favorites no kwandikira TikTak ku itangazo ushaka.
- Account: kwiyandikisha, kwinjira, gutangaza umutungo no kohereza amafoto.
- Customer dashboard: amatangazo yawe, Favorites, amasezerano n’ubutumwa bwohererezwa TikTak.
- Admin: overview, listings, clients, deals/offers, commissions, customer messages na Cloudinary images.
- `api.js` ikoresha `http://localhost:4000/api` nk'aho API iherereye; ushobora guhindura `localStorage` key `tiktak-api-base` igihe bikenewe.

Browser storage itandukanye kuri buri port. Niba winjiye kuri port `5500`, ariko Admin ukayifungura kuri `5501`, ugomba kongera kwinjira kuri `5501`.

### TikTak direct contact buttons

The public listing contact button opens TikTak's direct contact panel with:
- WhatsApp: +254 142 299 336 (opens a pre-filled message mentioning the selected listing)
- Call: +250 782 517 883
- Email: ndarishizeaima@gmail.com
- Existing in-app message flow remains available as a secondary option.


### Itangazo: amafoto na video
- Itangazo ry'inzu, ikibanza cyangwa imodoka risaba amafoto nibura 5 kandi ntarenze 10 (JPG, PNG, WEBP cyangwa AVIF; buri foto ntirenze 10 MB).
- Video imwe ni amahitamo: MP4, WEBM cyangwa MOV, ntirenze 100 MB. Yoherezwa muri Cloudinary kandi igaragazwa ku itangazo rusange.
- Backend ibuza kohereza amafoto ari munsi ya 5 no kwemeza itangazo ritayujuje.
