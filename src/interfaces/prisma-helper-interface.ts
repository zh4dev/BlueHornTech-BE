import { Request } from "express";
import { AllowedModels } from "../constants/enum-constant";

export interface PaginationParams {
  model: string;
  pageNumber?: number;
  pageSize?: number;
  filter?: Record<string, any>;
  filterIn?: Record<string, any>;
  filterGt?: Record<string, any>;
  filterGte?: Record<string, any>;
  filterLt?: Record<string, any>;
  filterLte?: Record<string, any>;
  filterOr?: Record<string, any>;
  search?: string;
  searchFields?: string[];
  include?: Record<string, any>;
  orderBy?: Record<string, any>;
}

export interface GetAllParams extends PaginationParams {
  req: Request;
  model: AllowedModels;
}
