// Referenced from blueprint:javascript_object_storage
import { useState } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";

/**
 * A file upload component that provides a modal interface for file management.
 * Uses Uppy under the hood to handle all file upload functionality.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  onUploadStart,
  onUploadError,
  buttonClassName,
  buttonStyle,
  children,
  allowedFileTypes = null,
  disabled = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() => {
    const restrictions = {
      maxNumberOfFiles,
      maxFileSize,
    };
    
    if (allowedFileTypes) {
      restrictions.allowedFileTypes = allowedFileTypes;
    }

    return new Uppy({ restrictions, autoProceed: false })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("upload", () => {
        if (onUploadStart) {
          onUploadStart();
        }
      })
      .on("upload-error", (file, error) => {
        if (onUploadError) {
          onUploadError(error);
        }
      })
      .on("complete", (result) => {
        if (onComplete) {
          onComplete(result);
        }
        setShowModal(false);
      });
  });

  return (
    <div>
      <button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        style={buttonStyle}
        disabled={disabled}
      >
        {children}
      </button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
