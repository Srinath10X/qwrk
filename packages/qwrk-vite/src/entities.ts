/**
 * The XHTML entities that JSX text and attribute strings may use: each name
 * is followed by its code point in base 36.
 */
const TABLE =
  "quot y amp 12 apos 13 lt 1o gt 1q nbsp 4g iexcl 4h cent 4i pound 4j " +
  "curren 4k yen 4l brvbar 4m sect 4n uml 4o copy 4p ordf 4q laquo 4r not " +
  "4s shy 4t reg 4u macr 4v deg 4w plusmn 4x sup2 4y sup3 4z acute 50 micro " +
  "51 para 52 middot 53 cedil 54 sup1 55 ordm 56 raquo 57 frac14 58 frac12 " +
  "59 frac34 5a iquest 5b Agrave 5c Aacute 5d Acirc 5e Atilde 5f Auml 5g " +
  "Aring 5h AElig 5i Ccedil 5j Egrave 5k Eacute 5l Ecirc 5m Euml 5n Igrave " +
  "5o Iacute 5p Icirc 5q Iuml 5r ETH 5s Ntilde 5t Ograve 5u Oacute 5v Ocirc " +
  "5w Otilde 5x Ouml 5y times 5z Oslash 60 Ugrave 61 Uacute 62 Ucirc 63 " +
  "Uuml 64 Yacute 65 THORN 66 szlig 67 agrave 68 aacute 69 acirc 6a atilde " +
  "6b auml 6c aring 6d aelig 6e ccedil 6f egrave 6g eacute 6h ecirc 6i euml " +
  "6j igrave 6k iacute 6l icirc 6m iuml 6n eth 6o ntilde 6p ograve 6q " +
  "oacute 6r ocirc 6s otilde 6t ouml 6u divide 6v oslash 6w ugrave 6x " +
  "uacute 6y ucirc 6z uuml 70 yacute 71 thorn 72 yuml 73 OElig 9e oelig 9f " +
  "Scaron 9s scaron 9t Yuml ag fnof b6 circ jq tilde kc Alpha pd Beta pe " +
  "Gamma pf Delta pg Epsilon ph Zeta pi Eta pj Theta pk Iota pl Kappa pm " +
  "Lambda pn Mu po Nu pp Xi pq Omicron pr Pi ps Rho pt Sigma pv Tau pw " +
  "Upsilon px Phi py Chi pz Psi q0 Omega q1 alpha q9 beta qa gamma qb delta " +
  "qc epsilon qd zeta qe eta qf theta qg iota qh kappa qi lambda qj mu qk " +
  "nu ql xi qm omicron qn pi qo rho qp sigmaf qq sigma qr tau qs upsilon qt " +
  "phi qu chi qv psi qw omega qx thetasym r5 upsih r6 piv ra ensp 6bm emsp " +
  "6bn thinsp 6bt zwnj 6bw zwj 6bx lrm 6by rlm 6bz ndash 6c3 mdash 6c4 " +
  "lsquo 6c8 rsquo 6c9 sbquo 6ca ldquo 6cc rdquo 6cd bdquo 6ce dagger 6cg " +
  "Dagger 6ch bull 6ci hellip 6cm permil 6cw prime 6cy Prime 6cz lsaquo 6d5 " +
  "rsaquo 6d6 oline 6da frasl 6dg euro 6gc image 6j5 weierp 6jc real 6jg " +
  "trade 6jm alefsym 6k5 larr 6mo uarr 6mp rarr 6mq darr 6mr harr 6ms crarr " +
  "6np lArr 6og uArr 6oh rArr 6oi dArr 6oj hArr 6ok forall 6ps part 6pu " +
  "exist 6pv empty 6px nabla 6pz isin 6q0 notin 6q1 ni 6q3 prod 6q7 sum 6q9 " +
  "minus 6qa lowast 6qf radic 6qi prop 6ql infin 6qm ang 6qo and 6qv or 6qw " +
  "cap 6qx cup 6qy int 6qz there4 6r8 sim 6rg cong 6rp asymp 6rs ne 6sg " +
  "equiv 6sh le 6sk ge 6sl sub 6te sup 6tf nsub 6tg sube 6ti supe 6tj oplus " +
  "6tx otimes 6tz perp 6ud sdot 6v9 lceil 6x4 rceil 6x5 lfloor 6x6 rfloor " +
  "6x7 lang 6y1 rang 6y2 loz 7gq spades 7kw clubs 7kz hearts 7l1 diams 7l2";

let entities: Map<string, string> | undefined;

/**
 * Decodes the entities of JSX text or of an attribute string, like Babel and
 * TypeScript: named XHTML entities and numeric references. Anything else stays
 * as written.
 */
export function decode(text: string) {
  if (!text.includes("&")) return text;

  if (!entities) {
    entities = new Map();
    const words = TABLE.split(" ");
    for (let i = 0; i < words.length; i += 2) {
      entities.set(words[i], String.fromCodePoint(parseInt(words[i + 1], 36)));
    }
  }

  return text.replace(
    /&(?:#x([\da-f]{1,6})|#(\d{1,7})|([a-z][a-z\d]{1,8}));/gi,
    (match, hex: string, decimal: string, name: string) => {
      if (name) return entities!.get(name) ?? match;
      const code = hex ? parseInt(hex, 16) : Number(decimal);
      return code <= 0x10ffff ? String.fromCodePoint(code) : match;
    },
  );
}
