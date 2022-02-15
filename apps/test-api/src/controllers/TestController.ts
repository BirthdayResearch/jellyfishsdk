import { Controller, Param, ForbiddenException, Get, PipeTransform, Injectable, HttpCode } from '@nestjs/common'

@Injectable()
export class TestPipe implements PipeTransform {
  transform (): string {
    throw new ForbiddenException('Boom shaka laka')
  }
}

@Controller()
export class TestController {
  @Get('/error')
  @HttpCode(200)
  getError (@Param('ignoreme', TestPipe) ignoreme: string): any {
    return true
  }
}
