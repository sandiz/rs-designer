
/* class representing the metadata of the media (ID3 tags)*/
export interface MediaInfo {
    song: string;
    artist: string;
    album: string;
    image: string; /*base64 encoded */
    year: string;
}