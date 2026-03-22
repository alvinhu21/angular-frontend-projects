import { ChartResponse, IndicatorResult } from "../../models/models";
import { StockRow } from "../utils/stock-utils";

export interface StockDisplay {
  chart: ChartResponse['chart']['result'][0];
  indicators: IndicatorResult;
  rows: StockRow[];
}