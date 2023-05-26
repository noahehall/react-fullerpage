import { useContext, type CSSProperties, type FC } from "react";
import {FullpageContext} from "./FullpageContext";

export interface FullpageCountInterface {
  style?: CSSProperties;
}
export const FullpageCount: FC<FullpageCountInterface> = ({
  style = {},
}) => {
  const { slides } = useContext(FullpageContext);

  return <span style={style}>{slides.length}</span>;
}
