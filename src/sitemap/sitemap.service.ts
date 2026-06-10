import { Injectable, NotFoundException } from '@nestjs/common';
import { SiteMap } from './schemas/sitemap.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateSiteMapDto } from './dto/update-sitemap.dto';
import { CreateSiteMapDto } from './dto/create-sitemap.dto';

@Injectable()
export class SitemapService {
  constructor(
    @InjectModel('sitemap_urls') private readonly sitemapModel: Model<SiteMap>,
  ) {}

  async create(createSiteMapDto: CreateSiteMapDto): Promise<SiteMap> {
    const sitemap = await this.sitemapModel.create(createSiteMapDto);
    return sitemap;
  }

  async findAll(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const searchCriteria = search
      ? {
          url: { $regex: search, $options: 'i' },
        } // case-insensitive search
      : {};
    const queryCriteria = {
      ...searchCriteria,
    };
    const data = await this.sitemapModel
      .find(queryCriteria)
      .skip(+skip)
      .limit(+limit)
      .exec();
    const countValue = await this.sitemapModel.countDocuments(queryCriteria);
    return {
      list: data,
      count: countValue,
      currentPage: +page,
      totalPages: Math.ceil(countValue / limit) || 0,
    };
  }

  async findOne(id: string): Promise<SiteMap> {
    const sitemap = await this.sitemapModel.findById(id).exec();
    if (!sitemap) {
      throw new NotFoundException(`Sitemap with ID ${id} not found`);
    }
    return sitemap;
  }

  async update(
    id: string,
    updateSiteMapDto: UpdateSiteMapDto,
  ): Promise<SiteMap> {
    const sitemap = await this.sitemapModel
      .findByIdAndUpdate(id, updateSiteMapDto, { new: true })
      .exec();
    if (!sitemap) {
      throw new NotFoundException(`Sitemap with ID ${id} not found`);
    }
    return sitemap;
  }

  async remove(id: string): Promise<SiteMap> {
    const sitemap = await this.sitemapModel.findByIdAndDelete(id).exec();
    if (!sitemap) {
      throw new NotFoundException(`Sitemap with ID ${id} not found`);
    }
    return sitemap;
  }
}
