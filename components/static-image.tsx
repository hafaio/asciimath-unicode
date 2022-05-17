import { ReactElement } from "react";
import Image, { ImageProps, ImageLoaderProps } from "next/image";

function staticLoader({ src }: ImageLoaderProps): string {
  return src;
}

interface StaticImageProps extends ImageProps {
  alt: string;
  loader?: never;
  unoptimized?: never;
}

export default function StaticImage({
  alt,
  ...props
}: StaticImageProps): ReactElement {
  return <Image alt={alt} {...props} loader={staticLoader} unoptimized />;
}
