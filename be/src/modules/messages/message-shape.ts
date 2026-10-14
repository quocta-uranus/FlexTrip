import { BadRequestException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { ALLOWED_MIME, MAX_FILES, isImageMime } from './attachment-validator';
import type { SendMessageDto } from './messages.dto';

// class-validator cannot express "fields depend on `type`", so the invariants live here.
export function validateSendShape(dto: SendMessageDto): void {
  const attachments = dto.attachments ?? [];
  const hasLocation = dto.latitude !== undefined || dto.longitude !== undefined || dto.locationLabel !== undefined;

  switch (dto.type) {
    case MessageType.TEXT:
      if (!dto.content?.trim()) throw new BadRequestException('Nội dung tin nhắn không được để trống');
      if (attachments.length || hasLocation) throw new BadRequestException('Tin văn bản không kèm file hoặc vị trí');
      return;
    case MessageType.IMAGE:
    case MessageType.FILE: {
      if (attachments.length < 1 || attachments.length > MAX_FILES) {
        throw new BadRequestException(`Cần từ 1 đến ${MAX_FILES} file`);
      }
      if (hasLocation) throw new BadRequestException('Tin file không kèm vị trí');
      const wantImage = dto.type === MessageType.IMAGE;
      for (const a of attachments) {
        if (!ALLOWED_MIME[a.mimeType]) throw new BadRequestException('Định dạng file không được hỗ trợ');
        if (isImageMime(a.mimeType) !== wantImage) {
          throw new BadRequestException(wantImage ? 'Tin ảnh chỉ chứa ảnh' : 'Tin file không chứa ảnh');
        }
      }
      return;
    }
    case MessageType.LOCATION:
      if (dto.latitude === undefined || dto.longitude === undefined) throw new BadRequestException('Thiếu toạ độ');
      if (attachments.length) throw new BadRequestException('Tin vị trí không kèm file');
      return;
  }
}
