import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import { Request } from "express";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";
import { PrismaClient } from "@prisma/client";
import {
  GetAllParams,
  PaginationParams,
} from "../interfaces/prisma-helper-interface";
import { ResponseListInterface } from "../interfaces/server/response-list-interface";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ErrorHelper } from "./error-helper";
import { AllowedModels, ServerCode } from "../constants/enum-constant";
import prisma from "../services/prisma-client-service";

class PrismaHelper {
  static getAll = async <T>({
    req,
    model,
    filterIn,
    filter,
    filterGt,
    filterGte,
    filterLt,
    filterLte,
    searchFields,
    include,
    orderBy,
  }: GetAllParams): Promise<ResponseListInterface<T>> => {
    try {
      const { pageNumber, pageSize, search } = req.query;

      if (!pageNumber) {
        throw new ServerErrorInterface(
          ErrorMessageConstant.someRequestAreEmpty,
          ServerCode.badRequest
        );
      }

      if (search && typeof search !== "string") {
        throw new ServerErrorInterface(
          ErrorMessageConstant.invalidRequest,
          ServerCode.badRequest
        );
      }

      const result = await this.getPaginationList<T>({
        model,
        pageNumber: Number(pageNumber ?? 1),
        pageSize: Number(pageSize ?? 15),
        search: search,
        searchFields: searchFields,
        filterIn,
        filter,
        filterGt,
        filterGte,
        filterLt,
        filterLte,
        include,
        orderBy,
      });

      return result;
    } catch (e) {
      throw e;
    }
  };

  static dataExistValue = async <T>({
    model,
    id,
    title,
    customValue,
  }: {
    model: AllowedModels;
    id?: any;
    title?: string;
    customValue?: Record<string, any>;
  }): Promise<T | null> => {
    const value = await (prisma[model] as any).findFirst({
      where: {
        ...(id ? { id } : {}),
        ...(title ? { title } : {}),
        ...customValue,
      },
    });
    if (value) {
      return value as unknown as T;
    } else {
      return null;
    }
  };

  static async getPaginationList<T>({
    model,
    pageNumber = 1,
    pageSize = 15,
    filter,
    filterIn,
    filterGt,
    filterGte,
    filterLt,
    filterLte,
    filterOr,
    search,
    searchFields,
    include,
    orderBy,
  }: PaginationParams): Promise<ResponseListInterface<T>> {
    try {
      const skip = (pageNumber - 1) * pageSize;

      const where: Record<string, any> = {
        AND: [],
      };

      if (filter) {
        for (const [field, value] of Object.entries(filter)) {
          where.AND.push({ [field]: value });
        }
      }

      if (filterIn) {
        for (const [field, value] of Object.entries(filterIn)) {
          where.AND.push({ [field]: { in: value } });
        }
      }

      if (filterGt) {
        for (const [field, value] of Object.entries(filterGt)) {
          where.AND.push({ [field]: { gt: value } });
        }
      }

      if (filterGte) {
        for (const [field, value] of Object.entries(filterGte)) {
          where.AND.push({ [field]: { gte: value } });
        }
      }

      if (filterLt) {
        for (const [field, value] of Object.entries(filterLt)) {
          where.AND.push({ [field]: { lt: value } });
        }
      }

      if (filterLte) {
        for (const [field, value] of Object.entries(filterLte)) {
          where.AND.push({ [field]: { lte: value } });
        }
      }

      if (filterOr) {
        const orConditions = [];
        for (const [field, value] of Object.entries(filterOr)) {
          orConditions.push({ [field]: value });
        }

        if (orConditions.length) {
          where.AND.push({ OR: orConditions });
        }
      }

      if (search && searchFields?.length) {
        const orConditions = searchFields.map((fieldPath) => {
          const pathParts = fieldPath.split(".");
          const searchObject: any = {
            contains: search,
            mode: "insensitive",
          };
          return pathParts.reduceRight(
            (acc, key) => ({ [key]: acc }),
            searchObject
          );
        });

        if (orConditions.length) {
          where.AND.push({ OR: orConditions });
        }
      }

      const modelDelegate = prisma[model as any] as any as {
        count: (args: { where: any }) => Promise<number>;
        findMany: (args: {
          where: any;
          skip: number;
          take: number;
          orderBy: Record<string, any>;
          include?: Record<string, any>;
        }) => Promise<T[]>;
      };

      const totalItems = await modelDelegate.count({ where });
      const results = await modelDelegate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: orderBy || { createdAt: "desc" },
        ...(include ? { include } : {}),
      });

      return {
        list: results.map((e: any) => {
          const { createdAt, updatedAt, ...rest } = e;
          return rest;
        }),
        pageNumber: pageNumber,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems: totalItems,
      };
    } catch (e) {
      await ErrorHelper.getMessage(e);
      return {
        list: [],
        pageNumber: 0,
        totalPages: 0,
        totalItems: 0,
      };
    }
  }
}

export default PrismaHelper;
