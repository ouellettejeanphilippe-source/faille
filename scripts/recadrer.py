"""
LE RECADRAGE D'UN PORTRAIT (repris de Cap 82-0, js/recadrage.js). Les photos
de Leaguepedia sont de deux familles : les détourées des séances de photos
officielles (la tête quelque part dans un grand vide transparent, à toutes les
tailles) et les vieilles photos opaques. Sur une détourée, on trouve la TÊTE
par la transparence — le haut de la silhouette, sa largeur dans le tiers du
haut — et on recadre pour qu'elle fasse toujours la même part du cadre, à la
même hauteur ; une opaque garde son cadre, serré par le haut. Le résultat est
un portrait 5:7 en WebP, le fond transparent gardé : c'est la fenêtre de la
carte qui met la couleur dessous.

Outil de fabrication seulement (Pillow), appelé par scripts/images.mjs :

    python3 scripts/recadrer.py <source> <cible> [<source> <cible> …]

Écrit une ligne par image : « cible famille ».
"""
import sys
from PIL import Image

LARGEUR, HAUTEUR = 320, 448      # 5:7
PART_TETE = 0.46                 # la largeur de la tête, en part de la largeur du cadre
MARGE_HAUT = 0.09                # le sommet du crâne, en part de la largeur du cadre sous le bord
SEUIL = 40                       # au-dessus, un pixel est opaque
PART_RANG = 0.015                # un rang compte s'il a au moins cette part de pixels opaques


def recadrer(source, cible):
    im = Image.open(source).convert('RGBA')
    W, H = im.size
    a = im.getchannel('A')
    px = a.load()
    detouree = px[2, 2] < 16 and px[W - 3, 2] < 16
    famille = 'opaque'
    if detouree:
        rangs = []
        for j in range(H):
            g = -1
            dr = -1
            n = 0
            for i in range(W):
                if px[i, j] > SEUIL:
                    if g < 0:
                        g = i
                    dr = i
                    n += 1
            rangs.append((g, dr) if n > W * PART_RANG else None)
        haut = next((j for j, r in enumerate(rangs) if r), -1)
        bas = H - 1
        while bas > haut and not rangs[bas]:
            bas -= 1
        if haut >= 0:
            fin = round(haut + 0.30 * (bas - haut))
            large, somme, k = 0, 0.0, 0
            for j in range(haut, fin + 1):
                r = rangs[j]
                if not r:
                    continue
                large = max(large, r[1] - r[0])
                somme += (r[0] + r[1]) / 2
                k += 1
            if large > 8 and k:
                cote = large / PART_TETE
                sx = somme / k - cote / 2
                sy = haut - MARGE_HAUT * cote
                famille = 'detouree'
    if famille == 'opaque':
        # Une photo opaque : toute sa largeur (ou sa hauteur, si elle est trop basse), serrée par le haut.
        cote = min(W, H / 1.4)
        sx = (W - cote) / 2
        sy = 0
    # L'image entière, placée dans le cadre : ce qui dépasse reste transparent, rien n'est étiré.
    e = LARGEUR / cote
    out = Image.new('RGBA', (LARGEUR, HAUTEUR), (0, 0, 0, 0))
    redim = im.resize((max(1, round(W * e)), max(1, round(H * e))), Image.LANCZOS)
    out.alpha_composite(redim, (round(-sx * e), round(-sy * e))) if -sx * e >= 0 and -sy * e >= 0 else out.paste(redim, (round(-sx * e), round(-sy * e)), redim)
    out.save(cible, 'WEBP', quality=85, method=4)
    return famille


if __name__ == '__main__':
    args = sys.argv[1:]
    for src, dst in zip(args[::2], args[1::2]):
        try:
            print(dst, recadrer(src, dst))
        except Exception as err:  # une image illisible ne fait pas tomber les autres
            print(dst, 'erreur', err, file=sys.stderr)
