import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  onModuleDestroy() {
    void this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
