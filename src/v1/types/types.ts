export type CreateProjectRequest = {
  title: MultipartField;
  description: MultipartField;
  files: MultipartFile[];
};

export type MultipartFile = {
  type: string;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
};

export type MultipartField = {
  type: string;
  fieldname: string;
  mimetype: string;
  encoding: string;
  value: string;
  fieldnameTruncated: boolean;
  valueTruncated: boolean;
};
