import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DevUserMiddleware } from './middleware/dev-user.middleware';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DevUserMiddleware).forRoutes('*');
  }
}
