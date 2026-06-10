import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Author extends Document {
  @Prop({ required: true, unique: true })
  author_name: string;

  @Prop()
  bio: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  current_position: string;

  @Prop()
  profile_picture: string;

  @Prop()
  awards_and_achievements: string;

  @Prop()
  alumni_of: string;

  @Prop()
  media_appearances: string;

  @Prop()
  facebook_profile_link: string;

  @Prop()
  twitter_profile_link: string;

  @Prop()
  instagram_profile_link: string;

  @Prop()
  linkedin_profile_link: string;

  @Prop()
  interesting_facts: string;

  @Prop()
  author_name_slug: string;
}

export const AuthorSchema = SchemaFactory.createForClass(Author);
