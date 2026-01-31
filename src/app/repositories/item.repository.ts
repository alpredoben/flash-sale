import { Repository, In } from 'typeorm';
import { Item } from '@models/item.model';
import databaseConfig from '@config/database.config';
import { En_ItemStatus } from '@constants/enum.constant';
import { In_ItemListParams } from '@interfaces/dto.interface';
import { In_PaginationResult } from '@interfaces/pagination.interface';

class ItemRepository {
  private static instance: ItemRepository;

  private constructor() {}

  public static getInstance(): ItemRepository {
    if (!ItemRepository.instance) {
      ItemRepository.instance = new ItemRepository();
    }
    return ItemRepository.instance;
  }

  public get repository(): Repository<Item> {
    return databaseConfig.getDataSource().getRepository(Item);
  }

  /** Find item by ID */
  async findById(id: string): Promise<Item | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['reservations'],
    });
  }

  /** Find item by SKU */
  async findBySku(sku: string): Promise<Item | null> {
    return await this.repository.findOne({
      where: { sku },
    });
  }

  /** Find multiple items by IDs */
  async findByIds(ids: string[]): Promise<Item[]> {
    return await this.repository.findBy({
      id: In(ids),
    });
  }

  /** Create new item */
  async create(itemData: Partial<Item>): Promise<Item> {
    const item = this.repository.create(itemData);
    return await this.repository.save(item);
  }

  /** Update item */
  async update(id: string, itemData: Partial<Item>): Promise<Item> {
    await this.repository.update(id, itemData);
    const updatedItem = await this.findById(id);
    if (!updatedItem) {
      throw new Error('Item not found after update');
    }
    return updatedItem;
  }

  /** Soft delete item */
  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.repository.update(id, { deletedBy });
    await this.repository.softDelete(id);
  }

  /** Get all items with pagination and filters */
  async findAll(params: In_ItemListParams): Promise<In_PaginationResult<Item>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      minPrice,
      maxPrice,
      inStock,
    } = params;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('item');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(item.name ILIKE :search OR item.sku ILIKE :search OR item.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('item.status = :status', { status });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('item.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('item.price <= :maxPrice', { maxPrice });
    }

    if (inStock !== undefined) {
      if (inStock) {
        queryBuilder.andWhere('item.availableStock > 0');
      } else {
        queryBuilder.andWhere('item.availableStock = 0');
      }
    }

    // Apply sorting
    queryBuilder.orderBy(`item.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const items = await queryBuilder.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** Get item with lock for update (for stock management) */
  async findByIdWithLock(id: string): Promise<Item | null> {
    return await this.repository
      .createQueryBuilder('item')
      .where('item.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  /** Update stock atomically */
  async updateStock(
    id: string,
    stockDelta: number,
    reservedStockDelta: number
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Item)
      .set({
        stock: () => `stock + ${stockDelta}`,
        reservedStock: () => `reserved_stock + ${reservedStockDelta}`,
        availableStock: () => `stock - reserved_stock`,
      })
      .where('id = :id', { id })
      .execute();
  }

  /** Check if item has sufficient stock */
  async hasStock(id: string, quantity: number): Promise<boolean> {
    const item = await this.repository.findOne({
      where: { id },
      select: ['id', 'availableStock'],
    });

    if (!item) return false;
    return item.availableStock >= quantity;
  }

  /** Get items by status */
  async findByStatus(status: En_ItemStatus): Promise<Item[]> {
    return await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get active items on sale */
  async findActiveSaleItems(): Promise<Item[]> {
    const now = new Date();

    return await this.repository
      .createQueryBuilder('item')
      .where('item.status = :status', { status: En_ItemStatus.ACTIVE })
      .andWhere('item.saleStartDate <= :now', { now })
      .andWhere('item.saleEndDate >= :now', { now })
      .andWhere('item.availableStock > 0')
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  /** Count items by status */
  async countByStatus(status: En_ItemStatus): Promise<number> {
    return await this.repository.count({
      where: { status },
    });
  }

  /** Get low stock items */
  async findLowStockItems(threshold: number = 10): Promise<Item[]> {
    return await this.repository
      .createQueryBuilder('item')
      .where('item.availableStock <= :threshold', { threshold })
      .andWhere('item.status = :status', { status: En_ItemStatus.ACTIVE })
      .orderBy('item.availableStock', 'ASC')
      .getMany();
  }

  /** Increment version (optimistic locking) */
  async incrementVersion(id: string): Promise<void> {
    await this.repository.increment({ id }, 'version', 1);
  }
}

export default ItemRepository.getInstance();
