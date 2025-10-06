import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigWebService } from './config-web.service';
import { CreateConfigWebDto } from './dto/create-config-web.dto';
import { UpdateConfigWebDto } from './dto/update-config-web.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';


@Controller('config-web')
export class ConfigWebController {
  constructor(private readonly configWebService: ConfigWebService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createConfigWebDto: CreateConfigWebDto) {
    return this.configWebService.create(createConfigWebDto);
  }

  @Get()
  findAll() {
    return this.configWebService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.configWebService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateConfigWebDto: UpdateConfigWebDto,
  ) {
    return this.configWebService.update(+id, updateConfigWebDto);
  }

 /* @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.configWebService.remove(+id);
  }*/

  // Banner endpoints
  @Post(':id/banners')
  @HttpCode(HttpStatus.CREATED)
  addBanner(
    @Param('id') configWebId: string,
    @Body() createBannerDto: CreateBannerDto,
  ) {
    return this.configWebService.addBanner(+configWebId, createBannerDto);
  }

  @Get(':id/banners')
  getBanners(@Param('id') configWebId: string) {
    return this.configWebService.getBanners(+configWebId);
  }

  @Patch('banners/:bannerId')
  updateBanner(
    @Param('bannerId') bannerId: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.configWebService.updateBanner(+bannerId, updateBannerDto);
  }

  @Delete('banners/:bannerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBanner(@Param('bannerId') bannerId: string) {
    return this.configWebService.removeBanner(+bannerId);
  }
}