        // Lightweight ID3 tag parser for MP3 files
        window.lightweightMetadata = {
            async parseFile(file) {
                try {
                    if (file.name.toLowerCase().endsWith('.mp3')) {
                        return await this.parseMP3(file);
                    }
                    return null; // Use fallback for other formats
                } catch (error) {
                    console.warn('Lightweight metadata parsing failed:', error);
                    return null;
                }
            },
            
            async parseMP3(file) {
                const buffer = await file.arrayBuffer();
                const view = new DataView(buffer);
                
                // Look for ID3v2 tag at beginning of file
                if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
                    return this.parseID3v2(view);
                }
                
                // Look for ID3v1 tag at end of file
                if (buffer.byteLength > 128) {
                    const id3v1Offset = buffer.byteLength - 128;
                    if (view.getUint8(id3v1Offset) === 0x54 && view.getUint8(id3v1Offset + 1) === 0x41 && view.getUint8(id3v1Offset + 2) === 0x47) {
                        return this.parseID3v1(view, id3v1Offset);
                    }
                }
                
                return null;
            },
            
            parseID3v2(view) {
                try {
                    const version = view.getUint8(3);
                    const flags = view.getUint8(5);
                    const size = this.getSynchsafeInt(view, 6);
                    
                    let offset = 10;
                    const metadata = {};
                    
                    while (offset < size + 10) {
                        if (offset + 4 >= view.byteLength) break;
                        
                        const frameId = String.fromCharCode(
                            view.getUint8(offset),
                            view.getUint8(offset + 1),
                            view.getUint8(offset + 2),
                            view.getUint8(offset + 3)
                        );
                        
                        const frameSize = version === 4 ? this.getSynchsafeInt(view, offset + 4) : 
                                         (view.getUint8(offset + 4) << 24) | (view.getUint8(offset + 5) << 16) | 
                                         (view.getUint8(offset + 6) << 8) | view.getUint8(offset + 7);
                        
                        if (frameSize === 0 || offset + 10 + frameSize > view.byteLength) break;
                        
                        const frameData = this.getFrameData(view, offset + 10, frameSize);
                        
                        switch (frameId) {
                            case 'TIT2': metadata.title = frameData; break;
                            case 'TPE1': metadata.artist = frameData; break;
                            case 'TALB': metadata.album = frameData; break;
                        }
                        
                        offset += 10 + frameSize;
                    }
                    
                    return metadata;
                } catch (error) {
                    console.warn('ID3v2 parsing error:', error);
                    return null;
                }
            },
            
            parseID3v1(view, offset) {
                try {
                    return {
                        title: this.getString(view, offset + 3, 30).trim(),
                        artist: this.getString(view, offset + 33, 30).trim(),
                        album: this.getString(view, offset + 63, 30).trim()
                    };
                } catch (error) {
                    console.warn('ID3v1 parsing error:', error);
                    return null;
                }
            },
            
            getSynchsafeInt(view, offset) {
                return (view.getUint8(offset) << 21) | (view.getUint8(offset + 1) << 14) | 
                       (view.getUint8(offset + 2) << 7) | view.getUint8(offset + 3);
            },
            
            getFrameData(view, offset, size) {
                // Skip encoding byte
                let start = offset + 1;
                let data = '';
                
                for (let i = start; i < offset + size && i < view.byteLength; i++) {
                    const byte = view.getUint8(i);
                    if (byte === 0) break; // Null terminator
                    data += String.fromCharCode(byte);
                }
                
                return data;
            },
            
            getString(view, offset, length) {
                let result = '';
                for (let i = 0; i < length && offset + i < view.byteLength; i++) {
                    const byte = view.getUint8(offset + i);
                    if (byte === 0) break;
                    result += String.fromCharCode(byte);
                }
                return result;
            }
        };
        
        console.log('✓ Lightweight metadata parser loaded');
console.log('✓ Lightweight metadata parser loaded');
