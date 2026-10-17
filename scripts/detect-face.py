# -*- coding: utf-8 -*-
"""Détecte le visage dans la photo Mec Calme (YuNet via OpenCV)."""
import os
import urllib.request
import cv2

IMG = r"c:\Users\user\Desktop\mec\assets\img\articles\mec-calme.jpg"
MODEL = os.path.join(os.environ["TEMP"], "yunet.onnx")

if not os.path.exists(MODEL):
    url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    print("Telechargement du modele YuNet...")
    urllib.request.urlretrieve(url, MODEL)
print("Model:", MODEL, os.path.getsize(MODEL), "bytes")

det = cv2.FaceDetectorYN.create(MODEL, "", (0, 0), 0.6, 0.3, 5000)
img = cv2.imread(IMG)
h, w = img.shape[:2]
print("Image:", w, "x", h)
det.setInputSize((w, h))
ret, faces = det.detect(img)
n = 0 if faces is None else len(faces)
print("Faces detectees:", n)
if faces is not None:
    for f in faces:
        x, y, fw, fh = f[:4]
        print("Visage: x=%.0f y=%.0f w=%.0f h=%.0f  (bas du visage y=%.0f)" % (x, y, fw, fh, y + fh))
