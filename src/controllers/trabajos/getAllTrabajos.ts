import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, verificarToken, successResponse, errorResponse } from '../../functions';
import { Estado } from '@prisma/client';

interface GetTrabajosQuery {
    token: string;
    page?: string;
    limit?: string;
    estado?: Estado;
    lineaDeInvestigacionId?: string;
    periodoAcademicoId?: string;
    search?: string;
    sortBy?: 'titulo' | 'autor' | 'id' | 'estado' | 'lineaDeInvestigacionId' | 'periodoAcademicoId';
    sortOrder?: 'asc' | 'desc';
}

const getTrabajo = async (
    request: FastifyRequest<{ Querystring: GetTrabajosQuery }>,
    reply: FastifyReply
) => {
    try {
        const {
            page = '1',
            limit = '10',
            estado,
            lineaDeInvestigacionId,
            periodoAcademicoId,
            search,
            sortBy = 'id', // Changed default from 'createdAt' to 'id'
            sortOrder = 'desc'
        } = request.query;

        // Convertir parámetros de paginación
        const pageNumber = parseInt(page, 10); // Fixed: changed from 20 to 10
        const limitNumber = parseInt(limit, 10); // Fixed: changed from 20 to 10
        const skip = (pageNumber - 1) * limitNumber;

        // Construir filtros
        const where: any = {};

        if (estado) {
            where.estado = estado;
        }

        if (lineaDeInvestigacionId) {
            where.lineaDeInvestigacionId = parseInt(lineaDeInvestigacionId, 10);
        }

        if (periodoAcademicoId) {
            where.periodoAcademicoId = parseInt(periodoAcademicoId, 10);
        }

        if (search) {
            where.OR = [
                {
                    titulo: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    autor: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }

        // Configurar ordenamiento - ensure we use a valid field
        const validSortFields = ['id', 'titulo', 'autor', 'lineaDeInvestigacionId', 'estado', 'doc', 'periodoAcademicoId', 'resumen'];
        const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'id';
        
        const orderBy: any = {};
        orderBy[finalSortBy] = sortOrder;

        // Obtener trabajos con paginación
        const [trabajos, totalCount] = await Promise.all([
            prisma.trabajo.findMany({
                where,
                include: {
                    lineaDeInvestigacion: {
                        select: {
                            id: true,
                            nombre: true
                        }
                    },
                    periodoAcademico: {
                        select: {
                            id: true,
                            periodo: true
                        }
                    }
                },
                orderBy,
                skip,
                take: limitNumber
            }),
            prisma.trabajo.count({ where })
        ]);

        // Calcular información de paginación
        const totalPages = Math.ceil(totalCount / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        const paginationInfo = {
            currentPage: pageNumber,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: limitNumber
        };

        return reply.status(200).send(
            successResponse({
                message: 'Trabajos obtenidos exitosamente',
                data: {
                    trabajos,
                    pagination: paginationInfo
                }
            })
        );

    } catch (error: any) {
        return reply.status(500).send(
            errorResponse({ message: error.message || 'Error al obtener los trabajos' })
        );
    }
};

export default getTrabajo;