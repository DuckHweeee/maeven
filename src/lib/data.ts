/**
 * All MAEVEN content. Copy is Vietnamese; the feature article also carries an
 * English body, which is what enables the VI/EN toggle on that piece.
 */

// Re-exported so existing `@/lib/data` imports keep working; the definitions
// live in `constants.ts` so client components can pull them without this module.
export { BRAND, NAV, SIZES } from "./constants";

export const MARQUEE_ITEMS = [
  "Giao 48 giờ toàn quốc",
  "Dệt tại Nam Định và Bảo Lộc",
  "Sửa chữa miễn phí hai năm",
  "Tạp chí mới thứ Tư và thứ Bảy",
];

export const PROMISES = [
  {
    kicker: "Sản xuất",
    body: "Mỗi mùa mười bốn mẫu, dệt tại Nam Định và Bảo Lộc. Tên xưởng in trên nhãn.",
  },
  {
    kicker: "Sửa miễn phí",
    body: "Sửa đường may và thay cúc miễn phí trong hai năm, tại cửa hàng hoặc qua bưu điện.",
  },
  {
    kicker: "Không giảm giá theo mùa",
    body: "Một mức giá suốt vòng đời sản phẩm. Hàng lỗi và mẫu thử bán riêng hai lần mỗi năm.",
  },
];

/* ------------------------------------------------------------------ product */

/**
 * The product codes, as a literal union rather than `string`.
 *
 * This is what makes a broken article-to-product link a compile error instead of
 * a recommendation block pointing at a 404. The site is prerendered, so anything
 * that only fails at runtime fails after it has shipped.
 */
export const SKUS = ["mv-01", "mv-02", "mv-03", "mv-04"] as const;
export type Sku = (typeof SKUS)[number];

export type Product = {
  no: string;
  /** Product code. Also the route param for /product/[sku]. */
  sku: Sku;
  name: string;
  price: string;
  material: string;
  blurb: string;
  gallery: { src: string; alt: string }[];
  specs: { k: string; v: string }[];
  /** The workshop that wove the cloth — printed on the label, shown on the card back. */
  maker: { workshop: string; place: string; story: string };
};

const CARE_REPAIR = { k: "Sửa chữa", v: "Miễn phí trong hai năm" };

export const PRODUCTS: Product[] = [
  {
    no: "01",
    sku: "mv-01",
    name: "Áo sơ mi lanh mộc",
    price: "1.480.000₫",
    material: "Lanh 100% · Nam Định",
    blurb:
      "Lanh 100% dệt tại Nam Định, giặt trước nên không rút thêm. Càng giặt càng mềm, và càng nhăn — đó là lanh, không phải lỗi.",
    gallery: [
      { src: "/img/product/01-linen-shirt.jpg", alt: "Áo sơ mi lanh mộc, chính diện" },
      { src: "/img/product/01-a.jpg", alt: "Áo treo trên cánh cửa gỗ dưới nắng xiên" },
      { src: "/img/product/01-b.jpg", alt: "Vải lanh trắng trải trên sàn gỗ, nắng lốm đốm" },
      { src: "/img/product/01-c.jpg", alt: "Vải lanh gấp xếp chồng trên rổ mây" },
    ],
    specs: [
      { k: "Chất liệu", v: "Lanh 100%, 180 g/m²" },
      { k: "Xuất xứ", v: "Dệt tại Nam Định, may tại Hà Nội" },
      { k: "Bảo quản", v: "Giặt máy 30°C, phơi bóng mát" },
      CARE_REPAIR,
    ],
    maker: {
      workshop: "Xưởng Hồng Phú",
      place: "Nam Định",
      story: "Ông Phú dệt vải lót cho hàng xuất khẩu suốt mười lăm năm. Năm 2023 ông bỏ, chuyển sang lanh. Hỏi vì sao thì ông chỉ nói: “Vải lót thì ai dệt chả được.”",
    },
  },
  {
    no: "02",
    sku: "mv-02",
    name: "Quần ống suông",
    price: "1.750.000₫",
    material: "Bông dệt chéo",
    blurb:
      "Bông dệt chéo 280 g/m². Cạp lửng, có chiết, ống suông từ gối xuống. Ngồi lâu không hằn, đứng dậy không phải kéo lại. Gấu để dư 4 cm nếu bạn muốn mang ra tiệm.",
    gallery: [
      { src: "/img/product/02-straight-trousers.jpg", alt: "Quần ống suông, chính diện" },
      { src: "/img/product/02-a.jpg", alt: "Cận cảnh thớ vải với nếp gấp dưới ánh sáng xiên" },
      { src: "/img/product/02-b.jpg", alt: "Chi tiết gấu quần" },
      { src: "/img/product/02-c.jpg", alt: "Quần gấp xếp chồng" },
    ],
    specs: [
      { k: "Chất liệu", v: "Bông dệt chéo, 280 g/m²" },
      { k: "Xuất xứ", v: "Dệt tại Nam Định, may tại Hà Nội" },
      { k: "Bảo quản", v: "Giặt máy 30°C, là hơi mặt trái" },
      CARE_REPAIR,
    ],
    maker: {
      workshop: "Xưởng Tân Tiến",
      place: "Nam Định",
      story: "Người dựng rập ở đây là con gái ông chủ, học may ở Sài Gòn rồi về. Chị bỏ cái túi sau bên phải vì bảo không ai dùng. Chúng tôi để chị quyết.",
    },
  },
  {
    no: "03",
    sku: "mv-03",
    name: "Áo khoác không cổ",
    price: "3.200.000₫",
    material: "Lanh pha gai dầu",
    blurb:
      "Không cổ, hai túi khâu ngoài, lót vai bằng chính vải thân nên mặc chồng lên sơ mi không cộm. Lanh pha gai dầu dệt tại Bảo Lộc, 240 g/m².",
    gallery: [
      { src: "/img/product/03-collarless-jacket.jpg", alt: "Áo khoác không cổ, chính diện" },
      { src: "/img/product/03-a.jpg", alt: "Cận cảnh thớ lanh dệt phẳng" },
      { src: "/img/product/03-b.jpg", alt: "Vải lanh trắng ngà với nếp nhăn tự nhiên" },
      { src: "/img/product/03-c.jpg", alt: "Áo khoác treo trên móc gỗ" },
    ],
    specs: [
      { k: "Chất liệu", v: "Lanh 55% / gai dầu 45%, 240 g/m²" },
      { k: "Xuất xứ", v: "Dệt tại Bảo Lộc, may tại Hà Nội" },
      { k: "Bảo quản", v: "Giặt tay hoặc giặt khô, phơi ngang" },
      CARE_REPAIR,
    ],
    maker: {
      workshop: "Xưởng Bảo Lâm",
      place: "Bảo Lộc",
      story: "Gai dầu trồng cách xưởng bốn mươi cây số. Xưởng chỉ nhận dệt từ tháng Hai đến tháng Chín, vì mùa mưa sợi hút ẩm và khung phải chỉnh lại mỗi sáng. Ngoài khoảng đó họ đóng cửa.",
    },
  },
  {
    no: "04",
    sku: "mv-04",
    name: "Áo thun cổ tròn",
    price: "620.000₫",
    material: "Sợi bông dài",
    blurb:
      "Sợi bông dài chải kỹ hai lần, 190 g/m², cổ bo dệt liền trên máy riêng. Thân thẳng, tay ngắn qua bắp.",
    gallery: [
      { src: "/img/product/04-crew-neck-tee.jpg", alt: "Áo thun cổ tròn, chính diện" },
      { src: "/img/product/04-a.jpg", alt: "Cận cảnh vải cotton dệt kim" },
      { src: "/img/product/04-b.jpg", alt: "Áo thun cổ tròn treo trên móc gỗ" },
      { src: "/img/product/04-c.jpg", alt: "Hai áo thun gấp, trắng và đen" },
    ],
    specs: [
      { k: "Chất liệu", v: "Sợi bông dài chải kỹ, 190 g/m²" },
      { k: "Xuất xứ", v: "Dệt tại Nam Định, may tại Hà Nội" },
      { k: "Bảo quản", v: "Giặt máy 30°C, không sấy nóng" },
      CARE_REPAIR,
    ],
    maker: {
      workshop: "Xưởng Nam Thành",
      place: "Nam Định",
      story: "Cổ bo do một người làm, bà Thoa, hai mươi hai năm ở xưởng. Máy dệt cổ chạy riêng, chậm. Bà bảo nếu chạy nhanh thì ba tháng sau cổ giãn.",
    },
  },
];

// A code can be declared in SKUS and then never given a product. The types
// cannot see that, so check it at module scope: data.ts is imported by every
// prerendered route, which makes this a build failure rather than a bad page.
for (const sku of SKUS) {
  if (!PRODUCTS.some((p) => p.sku === sku)) {
    throw new Error(`SKUS lists "${sku}" but no product defines it`);
  }
}

export function getProduct(sku: string) {
  return PRODUCTS.find((p) => p.sku === sku);
}


/* ------------------------------------------------------- MAEVEN by you */

export type CustomerPost = {
  id: string;
  img: string;
  alt: string;
  /** CSS aspect-ratio — the wall is deliberately mixed-format, like real UGC. */
  ratio: string;
  name: string;
  city: string;
  date: string;
  note: string;
  sku?: string;
  size?: string;
};

export const CUSTOMER_POSTS: CustomerPost[] = [
  {
    id: "u1", img: "/img/ugc/01.jpg", ratio: "2 / 3",
    alt: "Tay áo sơ mi lanh xắn lên",
    name: "Minh T.", city: "Hà Nội", date: "04.09.2026",
    sku: "mv-01", size: "M",
    note: "Mua định để đi cưới, xong tuần nào cũng lôi ra mặc đi làm. Thằng em mượn hai lần rồi chưa trả!",
  },
  {
    id: "u2", img: "/img/ugc/02.jpg", ratio: "3 / 4",
    alt: "Dáng người mặc quần ống suông nhìn từ phía sau",
    name: "Đức A.", city: "TP.HCM", date: "02.09.2026",
    sku: "mv-02", size: "L",
    note: "Đi xe máy cả ngày. Không nhăn nhiều như tôi tưởng.",
  },
  {
    id: "u3", img: "/img/ugc/03.jpg", ratio: "1 / 1",
    alt: "Ba món đồ xếp phẳng chuẩn bị cho chuyến đi",
    name: "Hoàng N.", city: "Đà Nẵng", date: "31.08.2026",
    note: "Xếp vào ba lô 20 lít vẫn còn thừa chỗ. Cái nhãn trong cổ hơi cứng, tôi cắt đi rồi. Ngoài ra ổn.",
  },
  {
    id: "u4", img: "/img/ugc/04.jpg", ratio: "1 / 1",
    alt: "Cận cảnh cổ áo sơ mi lanh",
    name: "Tuấn K.", city: "Hà Nội", date: "28.08.2026",
    sku: "mv-01", size: "S",
    note: "Trước mình hay mua sơ mi chỗ khác, rẻ hơn tầm ba trăm nghìn nhưng qua một mùa là cổ vênh. Cái này qua hè rồi chưa thấy vênh. Chưa dám nói trước gì thêm.",
  },
  {
    id: "u5", img: "/img/ugc/05.jpg", ratio: "3 / 4",
    alt: "Gấu quần và giày trên vỉa hè",
    name: "Bảo L.", city: "Huế", date: "26.08.2026",
    sku: "mv-02", size: "M",
    note: "Màu ngoài đời nhạt hơn trên web một chút... với mình thì không sao, ai kỹ thì nên biết trước.",
  },
  {
    id: "u6", img: "/img/ugc/06.jpg", ratio: "4 / 5",
    alt: "Bàn tay đút túi áo khoác",
    name: "Nam H.", city: "Hà Nội", date: "23.08.2026",
    sku: "mv-03", size: "L",
    note: "Ổn. Đi làm được, đi chơi được.",
  },
  {
    id: "u7", img: "/img/ugc/07.jpg", ratio: "1 / 1",
    alt: "Giá treo quần áo trong nhà",
    name: "Việt D.", city: "TP.HCM", date: "20.08.2026",
    note: "Năm nay tôi bỏ bớt đồ trong tủ. Còn lại toàn món mặc thật. Cái này nằm trong số đó.",
  },
  {
    id: "u8", img: "/img/ugc/08.jpg", ratio: "3 / 2",
    alt: "Tay áo lanh bên bàn cà phê",
    name: "Quân P.", city: "Hải Phòng", date: "18.08.2026",
    sku: "mv-01", size: "M",
    note: "Lanh thì nhăn thôi các bác ạ. Ai không chịu được nhăn thì đừng mua, mua rồi lại kêu.",
  },
  {
    id: "u9", img: "/img/ugc/09.jpg", ratio: "2 / 3",
    alt: "Cận cảnh vải áo thun cotton",
    name: "Trung V.", city: "Cần Thơ", date: "15.08.2026",
    sku: "mv-04", size: "M",
    note: "Cao 1m72 nặng 68 mặc size M hơi ôm ở vai. Ai vai rộng chắc nên lên một size.",
  },
];

/* ----------------------------------------------------------------- magazine */

export const RUBRICS = [
  "Tất cả",
  "Tin thời trang",
  "Phối đồ",
  "Grooming",
  "Đồ chơi",
  "Văn hóa",
];

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "quote"; text: string; by: string };

export type ArticleBody = {
  rubric: string;
  title: string;
  dek: string;
  readTime: string;
  credit: string;
  caption: string;
  sumHead: string;
  summary: string[];
  body: Block[];
};

/**
 * Funnel classification, from the journal spec. Deliberately separate from
 * `rubric`: a rubric is how a reader navigates the magazine (Grooming, Phối đồ),
 * a pillar is how the business classifies the piece. Collapsing them would force
 * one of the two to lie.
 */
export const PILLARS = ["style", "education", "culture", "brand", "product"] as const;
export type Pillar = (typeof PILLARS)[number];

/** Channels a piece can be reworked for. Editorial checklist, nothing automated. */
export const CHANNELS = ["instagram", "tiktok", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export type Article = ArticleBody & {
  slug: string;
  date: string;
  author: string;
  hero: string;
  card: string;
  pillar: Pillar;
  /**
   * Products this piece is genuinely about, in display order.
   *
   * Empty is the normal case, not a gap to fill. The magazine states on
   * /about-us that any piece touching a MAEVEN product will say so under its
   * headline — so a link here is a disclosure, and adding one where the piece is
   * not really about the garment would make that promise false.
   */
  relatedSkus: Sku[];
  /** Which channels this has already been reworked for. */
  repurposed: Channel[];
  /** Present only where a translation has actually been written. */
  en?: ArticleBody;
};

export const ARTICLES: Article[] = [
  {
    slug: "vietnamese-linen-returns",
    pillar: "culture",
    relatedSkus: ["mv-01", "mv-03"],
    repurposed: ["instagram"],
    date: "09.09.2026",
    author: "Nguyễn Hà Trang",
    hero: "/img/article/hero.jpg",
    card: "/img/editorial/lanh-nam-dinh.jpg",
    rubric: "Tin thời trang",
    title: "Mười hai khung dệt ở Nam Định, và một canh bạc về lanh",
    dek: "Ông Phú bỏ nghề dệt vải lót năm 2023 để dệt lanh. Ba năm sau, xưởng của ông kín đơn đến tháng Hai — và ông vẫn chưa dám mua thêm khung.",
    readTime: "2 phút đọc",
    credit: "Ảnh: Lê Quốc",
    caption: "Xưởng Hồng Phú, Nam Định. Tháng 8.2026.",
    sumHead: "Tóm tắt · 3 điểm",
    summary: [
      "Xưởng Hồng Phú chuyển từ vải lót xuất khẩu sang lanh năm 2023.",
      "Sản lượng còn một phần mười, giá bán gấp ba, đơn đặt kín đến tháng Hai.",
      "Ông Phú chưa mở rộng: ông chưa biết đợt hàng này kéo dài bao lâu.",
    ],
    body: [
      {
        t: "p",
        text: "Cổng sắt không biển hiệu, cuối một con ngõ ở Nam Định, và bên trong là mười hai khung dệt đang chạy. Ông Trần Văn Phú ngồi ở cái bàn kê sát cửa, chỗ nghe rõ tiếng máy nhất trong xưởng. Ông bảo nghe tiếng là biết sợi có đứt hay không, không cần đứng dậy nhìn.",
      },
      {
        t: "p",
        text: "Suốt mười lăm năm trước đó, xưởng dệt vải lót cho các đơn hàng xuất khẩu đi châu Âu. Việc thì đều, biên lợi nhuận thì mỏng, và theo lời ông thì “ai dệt chả được”. Năm 2023 ông bỏ hẳn, chuyển sang lanh, và giữ lại bốn thợ trong số mười một người.",
      },
      {
        t: "p",
        text: "Ba năm sau, mười hai khung chạy tám tiếng mỗi ngày cho bốn thương hiệu trong nước mà ông chưa gặp mặt ai. Sản lượng bằng khoảng một phần mười thời làm vải lót, giá mỗi mét gấp ba. Đơn đã kín đến tháng Hai năm sau.",
      },
      {
        t: "quote",
        text: "Khách bây giờ hỏi vải dệt ở đâu trước khi hỏi giá. Mười năm trước không ai hỏi câu đó.",
        by: "Trần Văn Phú, chủ xưởng Hồng Phú",
      },
      { t: "h2", text: "Vì sao ông chưa mua thêm khung" },
      {
        t: "p",
        text: "Đây là câu tôi hỏi ba lần và nhận ba câu trả lời khác nhau. Lần đầu ông nói vì tiền. Lần thứ hai vì không tìm được thợ biết chỉnh khung cũ. Lần thứ ba, lúc đã tắt máy và trời sắp tối, ông nói thật hơn: ông không biết đợt này kéo dài bao lâu.",
      },
      {
        t: "p",
        text: "Hai xưởng khác trong vùng cũng đang dệt lanh trở lại, cả hai đều nhỏ hơn Hồng Phú và cả hai đều từ chối cho tôi vào. Một người nhắn lại qua điện thoại rằng năm ngoái có một thương hiệu đặt bốn nghìn mét rồi huỷ, và từ đó họ không tiếp ai nữa.",
      },
      {
        t: "p",
        text: "Lúc tôi ra về, ông Phú đang gỡ một cuộn sợi rối ở khung số bảy. Tôi hỏi ông có định dệt lanh đến lúc nghỉ hẳn không. Ông bảo cuộn này để mai, giờ mắt không còn tinh.",
      },
    ],
    en: {
      rubric: "Fashion news",
      title: "Twelve looms in Nam Dinh, and a bet on linen",
      dek: "Mr. Phu quit weaving lining in 2023 to weave linen. Three years on, his workshop is booked to February — and he still has not bought another loom.",
      readTime: "2 min read",
      credit: "Photos: Le Quoc",
      caption: "Hong Phu workshop, Nam Dinh. August 2026.",
      sumHead: "Summary · 3 points",
      summary: [
        "Hong Phu switched from export lining to linen in 2023.",
        "Output fell to a tenth, the price tripled, and orders now run to February.",
        "Mr. Phu has not expanded: he does not know how long the demand lasts.",
      ],
      body: [
        {
          t: "p",
          text: "An iron gate with no sign, at the end of an alley in Nam Dinh. Inside: twelve looms, a ceiling fan that never stops, and Mr. Tran Van Phu at a desk by the door, where he can hear the machines. He says he can tell from the sound whether a thread has snapped, without looking.",
        },
        {
          t: "p",
          text: "For fifteen years before that, the workshop wove lining for export orders. Steady work, thin margins, and in his words, “anyone can weave lining”. In 2023 he stopped altogether and moved to linen, keeping four of his eleven weavers.",
        },
        {
          t: "p",
          text: "Three years on, the looms run eight hours a day for four Vietnamese labels. Output is about a tenth of the lining years. The price per metre is three times higher. The order book is full to February.",
        },
        {
          t: "quote",
          text: "Customers ask where the cloth was woven before they ask the price. Ten years ago nobody asked that.",
          by: "Tran Van Phu, owner, Hong Phu workshop",
        },
        { t: "h2", text: "Why he has not bought another loom" },
        {
          t: "p",
          text: "I asked three times and got three answers. First it was money. Then it was that he cannot find anyone who knows how to set an old loom. The third time, with the machines off and the light going, he said something closer to it: he does not know how long this lasts.",
        },
        {
          t: "p",
          text: "Two other workshops nearby have gone back to linen. Both are smaller than Hong Phu and both refused to let me in. One sent word by phone that a label ordered four thousand metres last year and then cancelled, and they have not taken visitors since.",
        },
        {
          t: "p",
          text: "As I left, Mr. Phu was working a tangled spool loose on loom seven. I asked whether he meant to weave linen until he retired. He said the spool could wait until morning, his eyes were done for the day.",
        },
      ],
    },
  },

  {
    slug: "one-shirt-four-ways",
    pillar: "style",
    relatedSkus: ["mv-01", "mv-02"],
    repurposed: ["instagram", "email"],
    date: "05.09.2026",
    author: "Lê Minh Quân",
    hero: "/img/editorial/so-mi-mot-tuan.jpg",
    card: "/img/editorial/so-mi-mot-tuan.jpg",
    rubric: "Phối đồ",
    title: "Một chiếc sơ mi mộc, bốn cách cài cúc",
    dek: "Không cần mua thêm. Chỉ cần quyết định cài đến đâu, xắn đến đâu, và bỏ trong hay ngoài.",
    readTime: "1 phút đọc",
    credit: "Ảnh: Trần Mai Anh",
    caption: "Chụp ở Hà Nội, tháng 7.2026.",
    sumHead: "Tóm tắt · 2 điểm",
    summary: [
      "Độ trang trọng của một chiếc sơ mi mộc nằm ở cách cài cúc và xắn tay, không nằm ở món mặc kèm.",
      "Cách thứ tư, mặc mở như một lớp khoác, hỏng khi trời xuống dưới 25 độ.",
    ],
    body: [
      {
        t: "p",
        text: "Sơ mi lanh mộc không có cổ dựng. Dễ mặc vì thế. Cũng dễ mặc sai vì thế. Bốn cách, một chiếc áo.",
      },
      { t: "h2", text: "Cài hết, bỏ trong" },
      {
        t: "p",
        text: "Trang trọng nhất mà chiếc áo này làm được. Bỏ trong quần ống rộng. Thêm một lớp khoác không cổ. Đừng thắt cà vạt. Cổ áo không dựng, cà vạt kéo nó gãy xuống. Giày da trơn.",
      },
      { t: "h2", text: "Xắn hai vòng, mở hai cúc" },
      {
        t: "p",
        text: "Xắn đến dưới khuỷu. Không hơn. Cao quá thì một tiếng sau tay áo tự tụt. Cách này để vải nhăn tự nhiên, và lanh nhăn mới đúng là lanh.",
      },
      { t: "h2", text: "Bỏ ngoài, không sửa gì thêm" },
      {
        t: "p",
        text: "Với quần short, hoặc quần vải mỏng. Gấu áo mộc cắt ngang, không lượn. Bỏ ngoài không hớ. Gấu lượn cong thì thôi, cách này hỏng.",
      },
      { t: "h2", text: "Mở hết, mặc như áo khoác" },
      {
        t: "p",
        text: "Bên trong một chiếc áo thun trơn. Sài Gòn tháng Năm: ổn. Hà Nội tháng Mười một: không. Dưới 25 độ, sơ mi mở phanh chỉ trông như quên cài cúc.",
      },
    ],
  },

  {
    slug: "two-days-in-hoi-an",
    pillar: "culture",
    relatedSkus: [],
    repurposed: [],
    date: "02.09.2026",
    author: "Phạm Thu Hà",
    hero: "/img/editorial/hoi-an.jpg",
    card: "/img/editorial/hoi-an.jpg",
    rubric: "Văn hóa",
    title: "Hai ngày ở Hội An, một túi xách tay",
    dek: "Tôi mang bảy món quần áo và dùng hết. Ba thứ khác thì không đụng tới.",
    readTime: "2 phút đọc",
    credit: "Ảnh: tác giả",
    caption: "Phố cổ lúc 6 giờ sáng, trước khi hàng quán mở.",
    sumHead: "Tóm tắt · 3 điểm",
    summary: [
      "Bảy món quần áo cho hai ngày, không tính đồ lót và tất.",
      "Ẩm cao khiến bông dày không kịp khô qua đêm; lanh thì kịp.",
      "Áo mưa, sạc dự phòng thứ hai và một đôi giày da: không dùng đến.",
    ],
    body: [
      {
        t: "p",
        text: "Tôi đặt ra một luật trước khi đi: tất cả phải nằm trong một túi xách tay ba mươi lít, kể cả máy ảnh. Sau hai ngày, luật đó vẫn còn thừa chỗ.",
      },
      {
        t: "p",
        text: "Bảy món: hai sơ mi lanh, một áo thun, một quần dài, một quần short, một áo khoác mỏng mặc lúc bay, một khăn. Đồ lót và tất cho ba ngày, không tính. Một đôi xăng đan dưới chân.",
      },
      {
        t: "p",
        text: "Buổi tối đầu tiên tôi giặt tay chiếc sơ mi đã mặc, vắt nhẹ, treo trước quạt lúc chín giờ. Bảy giờ sáng nó khô. Chiếc áo thun bông dày hơn, giặt cùng lúc, đến trưa hôm sau vẫn còn ẩm ở đường may vai. Ẩm kế trong phòng chỉ 85% suốt cả hai ngày, và tôi nghĩ đó là toàn bộ lời giải thích.",
      },
      {
        t: "p",
        text: "Ba thứ tôi không đụng tới. Một áo mưa gấp, vì cả hai ngày đều nắng. Một cục sạc dự phòng thứ hai. Và một đôi giày da, mang phòng khi phải đi ăn tối tử tế. Bữa tối đó hoá ra ở một quán sàn xi măng, bàn nhựa, ai cũng đi xăng đan.",
      },
      {
        t: "p",
        text: "Sáng thứ hai tôi dậy sớm hơn dự định. Sáu giờ, hàng quán chưa mở, một bà cụ đang quét đoạn vỉa hè trước cửa nhà mình, và cả con phố còn ướt từ đêm. Tôi ngồi xuống bậc thềm, chưa mặc giày, và không nghĩ gì cả trong khoảng mười lăm phút.",
      },
    ],
  },

  {
    slug: "minimal-grooming-humid-climate",
    pillar: "education",
    relatedSkus: [],
    repurposed: ["email"],
    date: "29.08.2026",
    author: "Đỗ Anh Khoa",
    hero: "/img/editorial/grooming.jpg",
    card: "/img/editorial/grooming.jpg",
    rubric: "Grooming",
    title: "Bớt lớp dưỡng đi khi trời ẩm",
    dek: "Phần lớn quy trình chăm da bán ở Việt Nam được viết cho khí hậu khô. Đây là cách rút gọn nó, và phần tôi chưa kiểm chứng được.",
    readTime: "2 phút đọc",
    credit: "Ảnh: Vũ Đình Nam",
    caption: "Năm món còn lại sau khi bỏ bớt. Tháng 7.2026.",
    sumHead: "Tóm tắt · 3 điểm",
    summary: [
      "Quy trình nhiều lớp được thiết kế cho khí hậu khô, không cho mùa hè miền Bắc.",
      "Rút xuống năm món, quy trình buổi sáng còn khoảng chín mươi giây.",
      "Chống nắng là món tôi giữ lại cuối cùng, dù đó là món khó chứng minh nhất trong ngắn hạn.",
    ],
    body: [
      {
        t: "p",
        text: "Trước hết cần phân biệt hai thứ hay bị gộp: giữ ẩm và cấp ẩm. Cấp ẩm là đưa nước vào lớp sừng. Giữ ẩm là ngăn lượng nước đó bay hơi. Quy trình bảy bước bán phổ biến hiện nay dành phần lớn công đoạn cho việc thứ hai, vốn là vấn đề của khí hậu khô.",
      },
      {
        t: "p",
        text: "Mùa hè năm ngoái tôi đo độ ẩm trong phòng làm việc ở Hà Nội bằng một chiếc ẩm kế rẻ tiền, mỗi ngày một lần trong sáu tuần. Con số dao động quanh 80% vào ban ngày. Với mức đó, da đã tự giữ được nước, và mỗi lớp dưỡng chồng thêm chủ yếu tạo thêm môi trường bí.",
      },
      { t: "h2", text: "Cái gì còn lại" },
      {
        t: "p",
        text: "Sữa rửa mặt dịu, pH quanh 5,5, sáng và tối. Một loại dưỡng ẩm dạng gel thay cho kem. Chống nắng SPF 50 PA++++, dùng lại sau khoảng bốn tiếng nếu ở ngoài trời. Tẩy da chết hoá học một lần mỗi tuần. Son dưỡng, vì điều hoà làm khô môi quanh năm.",
      },
      {
        t: "p",
        text: "Buổi sáng mất khoảng chín mươi giây: rửa, gel, chống nắng. Buổi tối bỏ bước chống nắng. Nếu phải cắt tiếp vì đi công tác, tôi cắt tẩy da chết trước, rồi đến gel.",
      },
      { t: "h2", text: "Phần tôi không chắc" },
      {
        t: "p",
        text: "Chống nắng là món tôi giữ lại đến cùng, nhưng cũng là món tôi ít có bằng chứng cá nhân nhất. Tác dụng của nó cộng dồn theo năm chứ không theo tuần, nên trong sáu tuần đo đạc tôi không quan sát được gì. Tôi giữ nó vì lý do khác: nếu sai thì cái sai đó không sửa lại được.",
      },
    ],
  },

  {
    slug: "three-hand-watches-under-20m",
    pillar: "style",
    relatedSkus: [],
    repurposed: [],
    date: "26.08.2026",
    author: "Lê Minh Quân",
    hero: "/img/editorial/dong-ho.jpg",
    card: "/img/editorial/dong-ho.jpg",
    rubric: "Đồ chơi",
    title: "Mua đồng hồ ba kim: hỏi thợ sửa trước khi hỏi người bán",
    dek: "Ở tầm dưới hai mươi triệu, thứ quyết định chiếc đồng hồ còn chạy sau mười năm nằm ở chỗ có kiếm được linh kiện hay không.",
    readTime: "1 phút đọc",
    credit: "Ảnh: Trần Mai Anh",
    caption: "Bàn làm việc của ông Sơn, phố Hàng Bồ.",
    sumHead: "Tóm tắt · 3 điểm",
    summary: [
      "Máy phổ biến quan trọng hơn thương hiệu ở tầm giá này.",
      "Chân dây tiêu chuẩn 18, 20 hoặc 22 mm để đổi dây không phải đặt riêng.",
      "Phiên bản giới hạn đắt hơn khi mua và khó hơn khi sửa.",
    ],
    body: [
      {
        t: "quote",
        text: "Đồng hồ hỏng thì sửa được. Đồng hồ không kiếm được linh kiện thì chỉ còn là kỷ niệm.",
        by: "Nguyễn Văn Sơn, thợ sửa đồng hồ phố Hàng Bồ",
      },
      {
        t: "p",
        text: "Ông nói câu đó lúc đang mở nắp lưng một chiếc đồng hồ. Chủ nó đã mang đi ba tiệm. Máy không hỏng. Máy chỉ dùng cho đúng một dòng, làm trong ba năm, ngừng đã lâu.",
      },
      { t: "h2", text: "Ba thứ nên hỏi" },
      {
        t: "p",
        text: "Máy nào. Máy đó còn dùng cho mẫu nào khác. Chân dây bao nhiêu milimet, vì 18, 20 và 22 thì đổi dây được ngay ngoài hàng. Kính sapphire hay khoáng. Kính xước là lý do người ta bỏ đồng hồ vào ngăn kéo.",
      },
      { t: "h2", text: "Cỡ mặt" },
      {
        t: "p",
        text: "Ông Sơn nói phần lớn khách đến tiệm ông có cổ tay quanh mười sáu đến mười bảy phẩy năm phân. Với cỡ đó thì mặt ba mươi sáu đến ba mươi chín milimet là vừa. Đó là chỗ ông ngồi ba mươi năm, không phải một cuộc khảo sát.",
      },
      {
        t: "p",
        text: "Chiếc đầu tiên tôi mua là bản giới hạn, đánh số ở mặt sau. Dây không phải cỡ tiêu chuẩn. Bốn năm sau dây mục. Tôi mất hai tháng tìm cái thay.",
      },
    ],
  },

  {
    slug: "cotton-prices-rising",
    pillar: "education",
    relatedSkus: ["mv-02", "mv-04"],
    repurposed: [],
    date: "22.08.2026",
    author: "Đỗ Anh Khoa",
    hero: "/img/editorial/cotton.jpg",
    card: "/img/editorial/cotton.jpg",
    rubric: "Tin thời trang",
    title: "Giá bông tăng, nhưng nhãn giá thì chưa",
    dek: "Giữa giá nguyên liệu và cái bạn trả có một quãng trễ. Đây là chỗ để nhìn trong lúc chờ.",
    readTime: "1 phút đọc",
    credit: "Ảnh: Vũ Đình Nam",
    caption: "Vụ bông tháng Tám.",
    sumHead: "Tóm tắt · 4 điểm",
    summary: [
      "Giá nguyên liệu không đi thẳng vào nhãn giá; ở giữa là hợp đồng sợi đã ký, vải đã dệt và hàng đã nằm kho.",
      "Thương hiệu có ba cách phản ứng, và chỉ một cách là nói thẳng.",
      "Định lượng vải giảm là thay đổi khó thấy nhất khi mua qua mạng.",
      "Tôi không kiểm chứng được định lượng nếu thương hiệu không công bố.",
    ],
    body: [
      {
        t: "p",
        text: "Một người làm mua hàng cho xưởng may ở Hưng Yên nói giá sợi anh ký quý này cao hơn quý trước khoảng mười hai phần trăm. Nhưng khách của anh chưa thấy gì. Sợi đã ký giá từ trước, vải đã dệt xong, hàng đã nằm kho. Ở quy mô xưởng anh làm, quãng trễ ấy thường là bốn đến sáu tháng.",
      },
      { t: "h2", text: "Ba cách phản ứng" },
      {
        t: "p",
        text: "Thứ nhất là pha sợi: thêm polyester để kéo giá xuống. Nhãn thành phần vẫn nói thật, nhưng phải lật ra mới thấy.",
      },
      {
        t: "p",
        text: "Thứ hai là giảm định lượng vải. Chiếc áo thun năm ngoái 210 g/m², năm nay 170 g/m², giá giữ nguyên. Cầm trên tay thì thấy ngay, mua qua mạng thì không.",
      },
      {
        t: "p",
        text: "Thứ ba là tăng giá và nói vì sao. Ít nơi chọn cách này, và tôi hiểu vì sao: nó là cách duy nhất buộc người bán phải giải thích.",
      },
      { t: "h2", text: "Chỗ tôi bí" },
      {
        t: "p",
        text: "Tôi vẫn khuyên tìm hai con số trên trang sản phẩm: tỷ lệ thành phần và định lượng g/m². Nhưng lời khuyên đó có một lỗ hổng mà tôi chưa vá được. Nếu thương hiệu không công bố định lượng, tôi không có cách nào kiểm chứng ngoài việc mua về rồi cân. Tôi đã cân ba chiếc và cả ba đều lệch so với con số công bố, theo cả hai chiều.",
      },
    ],
  },

  {
    slug: "neutral-palette-rainy-season",
    pillar: "style",
    relatedSkus: ["mv-01", "mv-02", "mv-04"],
    repurposed: [],
    date: "19.08.2026",
    author: "Phạm Thu Hà",
    hero: "/img/editorial/bang-mau.jpg",
    card: "/img/editorial/bang-mau.jpg",
    rubric: "Phối đồ",
    title: "Mùa mưa tôi mặc đúng hai màu",
    dek: "Không phải vì tối giản. Vì trắng tinh hiện vệt nước thành xám, và tôi không đủ kiên nhẫn.",
    readTime: "1 phút đọc",
    credit: "Ảnh: tác giả",
    caption: "Giá treo trong phòng, tháng 8.",
    sumHead: "Tóm tắt · 2 điểm",
    summary: [
      "Một màu sáng trung tính và một màu tối trung tính giấu vết nước tốt hơn trắng tinh hoặc đen tuyền.",
      "Sáu món trong cùng hệ màu thì không phải nghĩ buổi sáng.",
    ],
    body: [
      {
        t: "p",
        text: "Tháng Bảy năm ngoái tôi mặc một chiếc áo trắng đi làm giữa trận mưa rào. Đến cơ quan, vai áo hiện hai vệt xám hình bán nguyệt, và chúng ở đó suốt buổi sáng. Từ hôm đó tôi bỏ trắng tinh khỏi tủ mùa mưa.",
      },
      {
        t: "p",
        text: "Thay vào đó là hai màu. Một màu sáng trung tính, cát hoặc xám tro. Một màu tối trung tính, chàm sẫm hoặc xanh rêu. Cả hai đều ướt thì đổi màu nhẹ chứ không loang, và khô đi thì trở lại như cũ mà không để lại viền.",
      },
      {
        t: "p",
        text: "Tủ mùa mưa của tôi có sáu món, tất cả nằm trong hai màu đó: hai sơ mi, một áo thun, một quần dài, một quần short, một áo khoác mỏng. Vì cùng hệ màu nên buổi sáng tôi lấy bất cứ cái gì gần tay nhất. Đây không phải triết lý gì, chỉ là tôi dậy muộn.",
      },
      {
        t: "p",
        text: "Màu nhấn thì tôi để ở đúng một chỗ, thường là khăn hoặc tất, vì đó là hai thứ không dính mưa.",
      },
      {
        t: "p",
        text: "Sáng nay áo còn ẩm nên tôi treo nó ra ban công. Trời lại sắp mưa, mây xuống thấp phía cầu Long Biên, và tôi đang đứng đây tính xem có nên mang nó vào hay không.",
      },
    ],
  },
];

export const FEATURE_SLUG = ARTICLES[0].slug;

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Products a piece is about, resolved in the order the editor listed them. */
export function productsForArticle(article: Article) {
  return article.relatedSkus
    .map((sku) => PRODUCTS.find((p) => p.sku === sku))
    .filter((p): p is Product => Boolean(p));
}

/**
 * The reverse link, derived rather than declared.
 *
 * Storing it on the product as well would be two places to forget; this way an
 * editor adds `relatedSkus` to one article and both pages update.
 */
export function articlesForProduct(sku: string) {
  return ARTICLES.filter((a) => a.relatedSkus.some((s) => s === sku));
}

/** Three most recent pieces other than the one being read. */
export function relatedArticles(slug: string, count = 3) {
  return ARTICLES.filter((a) => a.slug !== slug).slice(0, count);
}
