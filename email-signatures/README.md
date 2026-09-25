# Alexander Yansons — email signatures

Four account-specific signatures, built with conservative table-based HTML so they survive Gmail, Apple Mail, and Mail.ru reasonably well.

## Which one to use

| Account | File | Intent |
| --- | --- | --- |
| `smizer_fun@mail.ru` | `smizer-fun.html` | Disposable / low-stakes. No professional links. |
| `yansons.al@gmail.com` | `yansons-al.html` | Main daily account. Branded, but still compact enough for normal replies. |
| `alex.yansons@gmail.com` | `alex-yansons.html` | Quiet everyday signature for the older account. |
| `hello@yansons.online` / `alexander@yansons.online` via iCloud | `yansons-online.html` | Professional signature for brand, studio, and client conversations. |

Open `preview.html` to compare all four.

## Install

### Gmail

1. Open the chosen `.html` file in a browser.
2. Select only the rendered signature and copy it.
3. In Gmail, go to **Settings → See all settings → General → Signature**.
4. Create a signature, paste it, then assign it to the relevant address.
5. Send yourself a test message from desktop and mobile.

### Apple Mail / iCloud

1. Open the chosen `.html` file in Safari and copy the rendered signature.
2. In Mail, go to **Settings → Signatures**, add a signature, and paste.
3. Disable **Always match my default message font** if Mail changes the styling.
4. Assign the signature separately to `hello@` and `alexander@` if both aliases appear in Mail.

### Mail.ru

Open **Settings → All settings → Sender name and signature**, then paste the rendered `smizer-fun.html` signature. Mail.ru may normalize spacing; that footer intentionally has almost no styling to lose.

## Graphic dependency

The two branded signatures load their animated ASCII graphics from:

`https://yansons.online/email/signature-ascii-walker-light.gif`

`https://yansons.online/email/signature-ascii-walker-dark.gif`

The name uses the folio's Geist Pixel Square face in its original title case, baked into two tiny transparent assets because email clients do not reliably load custom webfonts:

`https://yansons.online/email/signature-name-black.png`

`https://yansons.online/email/signature-name-white.png`

The matching animated assets are included under `public/email/`. They use all 37 of the portfolio's original light and dark walker frames. Two empty rows are removed from the top; the light figure is fitted at `114×176` and the dark figure at `128×176` inside their square canvases, without thresholding or transparency effects. They will resolve publicly after this site version is deployed. Clients without animated-GIF support show a deliberate first frame containing the full figure.

## Notes

- All essential information remains readable with remote images disabled.
- Links use full HTTPS URLs and the layout does not rely on external fonts, CSS files, SVG, JavaScript, or dark-mode hacks. The live portfolio fonts are approximated with durable system stacks; the graphic carries the exact ASCII visual language.
- Keep the signatures short in replies; Gmail can trim long repeated threads.
