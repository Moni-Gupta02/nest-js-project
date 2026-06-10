import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class KitchenSummaryReportQueryDto {
    @IsNotEmpty()
    @IsString()
    date: string;

    @IsNotEmpty()
    @IsString()
    phase: string;
}

export class PlatingSummaryReportQueryDto {
    @IsNotEmpty()
    @IsString()
    date: string;

    @IsNotEmpty()
    @IsIn(['MP', 'mp', 'Batch1'])
    phase: string;
}

export class PortioningSummaryReportQueryDto {
    @IsNotEmpty()
    @IsString()
    date: string;

    @IsNotEmpty()
    @IsString()
    phase: string;
}

export class PortioningSummaryExportPdfQueryDto extends PortioningSummaryReportQueryDto {
    @IsNotEmpty()
    @IsIn([
        'breakfast',
        'meal',
        'snack',
        'snacks',
        'snak',
        'Breakfast',
        'Meal',
        'Snack',
    ])
    type: string;
}