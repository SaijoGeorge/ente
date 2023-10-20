import {
    Backdrop,
    Box,
    CircularProgress,
    IconButton,
    Tab,
    Tabs,
    useTheme,
} from '@mui/material';
import {
    useEffect,
    useRef,
    useState,
    createContext,
    Dispatch,
    SetStateAction,
    MutableRefObject,
} from 'react';

import { EnteFile } from 'types/file';
import { getRenderableFileURL } from 'utils/file';
import downloadManager from 'services/downloadManager';
import { MenuItemGroup } from 'components/Menu/MenuItemGroup';
import { EnteMenuItem } from 'components/Menu/EnteMenuItem';
import CropOriginalIcon from '@mui/icons-material/CropOriginal';
import MenuSectionTitle from 'components/Menu/MenuSectionTitle';
import DownloadIcon from '@mui/icons-material/Download';
import mime from 'mime-types';
import CloseIcon from '@mui/icons-material/Close';
import { HorizontalFlex } from 'components/Container';
import TransformMenu from './TransformMenu';
import ColoursMenu from './ColoursMenu';
import { FileWithCollection } from 'types/upload';
import uploadManager from 'services/upload/uploadManager';
import { getLocalCollections } from 'services/collectionService';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MenuItemDivider from 'components/Menu/MenuItemDivider';

interface IProps {
    file: EnteFile;
    show: boolean;
    onClose: () => void;
}

export const ImageEditorOverlayContext = createContext(
    {} as {
        canvasRef: MutableRefObject<HTMLCanvasElement>;
        originalSizeCanvasRef: MutableRefObject<HTMLCanvasElement>;
        // setNonFilteredFileURL: Dispatch<SetStateAction<string>>;
        setTransformationPerformed: Dispatch<SetStateAction<boolean>>;
        setCanvasLoading: Dispatch<SetStateAction<boolean>>;
        canvasLoading: boolean;
    }
);

const ImageEditorOverlay = (props: IProps) => {
    // const [originalWidth, originalHeight] = [props.file?.w, props.file?.h];

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalSizeCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const parentRef = useRef<HTMLDivElement | null>(null);

    const [fileURL, setFileURL] = useState<string>('');

    const [currentRotationAngle, setCurrentRotationAngle] = useState(0);

    const [currentTab, setCurrentTab] = useState<'transform' | 'colours'>(
        'transform'
    );

    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [blur, setBlur] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [invert, setInvert] = useState(false);

    const [transformationPerformed, setTransformationPerformed] =
        useState(false);

    const [canvasLoading, setCanvasLoading] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        applyFilters([canvasRef.current]);
    }, [brightness, contrast, blur, saturation, invert, canvasRef, fileURL]);

    const applyFilters = async (canvases: HTMLCanvasElement[]) => {
        const filterString = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) saturate(${saturation}%) invert(${
            invert ? 1 : 0
        })`;

        for (const canvas of canvases) {
            const context = canvas.getContext('2d');
            context.imageSmoothingEnabled = false;

            context.filter = filterString;

            const image = new Image();
            image.src = fileURL;

            await new Promise((resolve) => {
                image.onload = () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    context.save();

                    context.drawImage(image, 0, 0, canvas.width, canvas.height);

                    context.restore();

                    resolve(true);
                };
            });
        }
    };

    useEffect(() => {
        if (currentRotationAngle >= 360 || currentRotationAngle <= -360) {
            // set back to 0
            setCurrentRotationAngle(0);
        }
    }, [currentRotationAngle]);

    const resetFilters = () => {
        setBrightness(100);
        setContrast(100);
        setBlur(0);
        setSaturation(100);
        setInvert(false);
    };

    const loadCanvas = async () => {
        setCanvasLoading(true);
        setTransformationPerformed(false);
        resetFilters();
        setCurrentRotationAngle(0);

        const img = new Image();
        const ctx = canvasRef.current?.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (!fileURL) {
            const stream = await downloadManager.downloadFile(props.file);
            const fileBlob = await new Response(stream).blob();
            const { converted } = await getRenderableFileURL(
                props.file,
                fileBlob
            );
            img.src = converted[0];
            setFileURL(converted[0]);
        } else {
            img.src = fileURL;
        }

        img.onload = () => {
            const scale = Math.min(
                parentRef.current?.clientWidth / img.width,
                parentRef.current?.clientHeight / img.height
            );

            const width = img.width * scale;
            const height = img.height * scale;
            canvasRef.current.width = width;
            canvasRef.current.height = height;

            ctx?.drawImage(img, 0, 0, width, height);

            originalSizeCanvasRef.current.width = img.width;
            originalSizeCanvasRef.current.height = img.height;

            const oSCtx = originalSizeCanvasRef.current.getContext('2d');

            oSCtx?.drawImage(img, 0, 0, img.width, img.height);

            setCanvasLoading(false);
        };
    };

    useEffect(() => {
        if (!props.show || !props.file) return;
        loadCanvas();
    }, [props.show, props.file]);

    const theme = useTheme();

    const exportCanvasToBlob = (callback: (blob: Blob) => void) => {
        const canvas = originalSizeCanvasRef.current;
        if (!canvas) return;

        const mimeType = mime.lookup(props.file.metadata.title);

        const image = new Image();
        image.src = canvas.toDataURL();

        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.toBlob(callback, mimeType);
    };

    return (
        <>
            {props.show && (
                <>
                    <Backdrop
                        sx={{
                            color: '#fff',
                            zIndex: '999 !important',
                            display: 'flex',
                            width: '100%',
                            justifyContent: 'space-between',
                            backdropFilter: 'blur(5px)',
                        }}
                        open>
                        <Box
                            display="inline-block"
                            width="100%"
                            height="100%"
                            overflow="hidden"
                            padding="3rem"
                            boxSizing={'border-box'}>
                            <Box
                                height="100%"
                                width="100%"
                                ref={parentRef}
                                display="flex"
                                alignItems="center"
                                justifyContent="center">
                                {(fileURL === null || canvasLoading) && (
                                    <CircularProgress />
                                )}

                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        objectFit: 'contain',
                                        display:
                                            fileURL === null || canvasLoading
                                                ? 'none'
                                                : 'block',
                                        position: 'absolute',
                                    }}
                                />
                                <canvas
                                    ref={originalSizeCanvasRef}
                                    style={{
                                        display: 'none',
                                    }}
                                />
                            </Box>
                        </Box>
                        <Box
                            height="100%"
                            width="30rem"
                            bgcolor={theme.colors.background.elevated}
                            padding="1rem"
                            boxSizing="border-box"
                            sx={{
                                overflowY: 'auto',
                            }}>
                            <HorizontalFlex justifyContent={'flex-end'}>
                                <IconButton
                                    onClick={() => {
                                        setFileURL(null);
                                        props.onClose();
                                    }}>
                                    <CloseIcon />
                                </IconButton>
                            </HorizontalFlex>
                            <HorizontalFlex gap="0.5rem" marginBottom="1rem">
                                <Tabs
                                    value={currentTab}
                                    onChange={(_, value) => {
                                        setCurrentTab(value);
                                    }}>
                                    <Tab label="Transform" value="transform" />
                                    <Tab
                                        label="Colours"
                                        value="colours"
                                        disabled={transformationPerformed}
                                    />
                                </Tabs>
                            </HorizontalFlex>
                            <MenuSectionTitle title="Reset" />
                            <MenuItemGroup
                                style={{
                                    marginBottom: '0.5rem',
                                }}>
                                <EnteMenuItem
                                    disabled={canvasLoading}
                                    startIcon={<CropOriginalIcon />}
                                    onClick={() => {
                                        loadCanvas();
                                    }}
                                    label={'Restore Original'}
                                />
                            </MenuItemGroup>

                            {currentTab === 'transform' && (
                                <ImageEditorOverlayContext.Provider
                                    value={{
                                        originalSizeCanvasRef,
                                        canvasRef,
                                        setCanvasLoading,
                                        canvasLoading,
                                        // setNonFilteredFileURL,
                                        setTransformationPerformed,
                                    }}>
                                    <TransformMenu />
                                </ImageEditorOverlayContext.Provider>
                            )}
                            {currentTab === 'colours' && (
                                <ColoursMenu
                                    brightness={brightness}
                                    contrast={contrast}
                                    saturation={saturation}
                                    blur={blur}
                                    invert={invert}
                                    setBrightness={setBrightness}
                                    setContrast={setContrast}
                                    setSaturation={setSaturation}
                                    setBlur={setBlur}
                                    setInvert={setInvert}
                                />
                            )}

                            <MenuSectionTitle title={'Export'} />
                            <MenuItemGroup>
                                <EnteMenuItem
                                    startIcon={<DownloadIcon />}
                                    onClick={async () => {
                                        if (!canvasRef.current) return;

                                        await applyFilters([
                                            originalSizeCanvasRef.current,
                                        ]);

                                        exportCanvasToBlob((blob) => {
                                            if (!blob) {
                                                return console.error('no blob');
                                            }
                                            // create a link
                                            const a =
                                                document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download =
                                                props.file.metadata.title;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(a.href);
                                        });
                                    }}
                                    label={'Download Edited'}
                                />
                                <MenuItemDivider />
                                <EnteMenuItem
                                    startIcon={<CloudUploadIcon />}
                                    onClick={async () => {
                                        if (!canvasRef.current) return;

                                        await applyFilters([
                                            originalSizeCanvasRef.current,
                                        ]);

                                        const collections =
                                            await getLocalCollections();

                                        const collection = collections.find(
                                            (c) =>
                                                c.id === props.file.collectionID
                                        );

                                        exportCanvasToBlob((blob) => {
                                            if (!blob) {
                                                return console.error('no blob');
                                            }

                                            const newFile = new File(
                                                [blob],
                                                props.file.metadata.title,
                                                {
                                                    type: blob.type,
                                                    lastModified:
                                                        new Date().getTime(),
                                                }
                                            );

                                            const file: FileWithCollection = {
                                                file: newFile,
                                                collectionID:
                                                    props.file.collectionID,
                                                collection,
                                                localID: 1,
                                            };

                                            uploadManager.prepareForNewUpload();
                                            uploadManager.showUploadProgressDialog();

                                            uploadManager.queueFilesForUpload(
                                                [file],
                                                [collection],
                                                uploadManager.getUploaderName()
                                            );
                                            props.onClose();
                                        });
                                    }}
                                    label={'Save a copy to ente'}
                                />
                            </MenuItemGroup>
                        </Box>
                    </Backdrop>
                </>
            )}
        </>
    );
};

export default ImageEditorOverlay;
