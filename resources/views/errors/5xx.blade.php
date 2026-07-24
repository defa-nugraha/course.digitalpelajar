@extends('errors.layout')

@section('title', 'Server Bermasalah')
@section('badge', 'Error {{ $exception->getStatusCode() }}')
@section('code', (string) $exception->getStatusCode())
@section('heading', 'Server sedang mengalami kendala.')
@section('message', 'Silakan coba lagi beberapa saat lagi. Jika masih terjadi, hubungi admin platform.')
