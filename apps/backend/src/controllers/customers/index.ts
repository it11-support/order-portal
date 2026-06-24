import { CustomersWhereInput } from "@/generated/prisma/models";
import { prisma } from "@utils"
import { Request, Response } from "express";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@repo/shared"

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  // 1. Parsing parameter query dari SWR Frontend
  const page = parseInt(req.query.page as string) || DEFAULT_PAGE
  const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
  const search = (req.query.search as string) || '';
  const showInactive = req.query.showInactive === 'true'

  const skip = (page - 1) * limit;

  const whereCondition: CustomersWhereInput = search.trim() !== ''
    ? {
      OR: [
        { CardCode: { contains: search, mode: 'insensitive' as const } },
        { CardName: { contains: search, mode: 'insensitive' as const } },
      ],
    }
    : {};

  // Cek parameter showInactive
  if (!showInactive) {
    whereCondition.NonActive = 'N'
  }

  const [totalRecords, customers] = await prisma.$transaction([
    prisma.customers.count({ where: whereCondition }),
    prisma.customers.findMany({
      where: whereCondition,
      include: {
        Subgroup: true,
      },
      skip: skip,
      take: limit,
      orderBy: {
        CardCode: 'asc',
      }
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);
  
  res.status(200).json({
    data: customers,
    meta: {
      current_page: page,
      total_pages: totalPages,
      total_records: totalRecords,
      limit: limit
    },
  });
};
