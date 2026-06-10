import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthorDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the author' })
  author_name: string;

  @ApiProperty({
    example: 'Author bio',
    description: 'Short biography of the author',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Author email address',
  })
  email: string;

  @ApiProperty({
    example: 'Writer at XYZ Publications',
    description: 'Current position of the author',
    required: false,
  })
  current_position?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'URL of the profile picture',
    required: false,
  })
  profile_picture?: string;

  @ApiProperty({
    example: 'Pulitzer Prize 2020',
    description: 'Awards and achievements of the author',
    required: false,
  })
  awards_and_achievements?: string;

  @ApiProperty({
    example: 'Harvard University',
    description: 'Alumni information',
    required: false,
  })
  alumni_of?: string;

  @ApiProperty({
    example: 'Interview with CNN',
    description: 'Media appearances of the author',
    required: false,
  })
  media_appearances?: string;

  @ApiProperty({
    example: 'https://facebook.com/johndoe',
    description: 'Facebook profile link',
    required: false,
  })
  facebook_profile_link?: string;

  @ApiProperty({
    example: 'https://twitter.com/johndoe',
    description: 'Twitter profile link',
    required: false,
  })
  twitter_profile_link?: string;

  @ApiProperty({
    example: 'https://instagram.com/johndoe',
    description: 'Instagram profile link',
    required: false,
  })
  instagram_profile_link?: string;

  @ApiProperty({
    example: 'https://linkedin.com/in/johndoe',
    description: 'LinkedIn profile link',
    required: false,
  })
  linkedin_profile_link?: string;

  @ApiProperty({
    example: 'Has a black belt in Karate',
    description: 'Interesting facts about the author',
    required: false,
  })
  interesting_facts?: string;

  @ApiProperty({
    example: 'john-doe',
    description: 'Slug for the author name',
    required: false,
  })
  author_name_slug?: string;
}
