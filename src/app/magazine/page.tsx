import type { Metadata } from "next";
import MagazineBrowser from "./MagazineBrowser";

export const metadata: Metadata = {
  title: "Tạp chí",
  description:
    "Tin thời trang, hướng dẫn phối đồ, grooming, đồ chơi và văn hóa — ba bài mỗi tuần.",
};

export default function MagazinePage() {
  return <MagazineBrowser />;
}
